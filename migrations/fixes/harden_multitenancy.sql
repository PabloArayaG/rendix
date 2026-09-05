-- =====================================================================
-- HARDENING MULTI-ORGANIZACIÓN
-- Ejecutar en Supabase con respaldo previo y después de verificar que
-- projects y expenses ya tienen organization_id poblado.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Helpers sin recursión RLS. Nunca aceptan un user_id del cliente.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_organization_member(target_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = target_org
      AND om.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_organization_role(target_org UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = target_org
      AND om.user_id = auth.uid()
      AND om.role = ANY(allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.is_organization_member(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_organization_role(UUID, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_organization_role(UUID, TEXT[]) TO authenticated;

-- ---------------------------------------------------------------------
-- El owner se administra desde organizations, no modificando directamente
-- su membresía ni creando propietarios adicionales.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_organization_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_owner UUID;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'No se puede cambiar el usuario ni la organización de una membresía';
    END IF;
  END IF;

  SELECT owner_id INTO current_owner
  FROM public.organizations
  WHERE id = COALESCE(NEW.organization_id, OLD.organization_id);

  IF TG_OP = 'INSERT' AND NEW.role = 'owner' AND NEW.user_id <> current_owner THEN
    RAISE EXCEPTION 'No se pueden crear propietarios adicionales';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.user_id = current_owner AND (NEW.user_id <> OLD.user_id OR NEW.role <> 'owner') THEN
      RAISE EXCEPTION 'No se puede modificar la membresía del propietario';
    END IF;
    IF NEW.role = 'owner' AND NEW.user_id <> current_owner THEN
      RAISE EXCEPTION 'No se pueden crear propietarios adicionales';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.user_id = current_owner THEN
    RAISE EXCEPTION 'No se puede eliminar la membresía del propietario';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_organization_owner_membership_trigger ON public.organization_members;
CREATE TRIGGER protect_organization_owner_membership_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.protect_organization_owner_membership();

REVOKE ALL ON FUNCTION public.protect_organization_owner_membership() FROM PUBLIC, anon, authenticated;

-- La creación de una organización debe poder agregar al owner aunque las
-- políticas de membresía ya estén activas.
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.add_owner_as_member() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_add_owner_as_member ON public.organizations;
CREATE TRIGGER trigger_add_owner_as_member
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

-- La transferencia de propiedad requiere una operación transaccional dedicada.
-- Mientras no exista ese flujo, se impide dejar owner_id y membresías desalineados.
CREATE OR REPLACE FUNCTION public.prevent_organization_owner_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'La transferencia de propiedad no está habilitada';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_organization_owner_change_trigger ON public.organizations;
CREATE TRIGGER prevent_organization_owner_change_trigger
BEFORE UPDATE OF owner_id ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.prevent_organization_owner_change();

REVOKE ALL ON FUNCTION public.prevent_organization_owner_change() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- Eliminar todas las políticas acumuladas y recrearlas explícitamente.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('organizations', 'organization_members', 'projects', 'expenses')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END $$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_select ON public.organizations
FOR SELECT TO authenticated
USING (public.is_organization_member(id));

CREATE POLICY organizations_insert ON public.organizations
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY organizations_update ON public.organizations
FOR UPDATE TO authenticated
USING (public.has_organization_role(id, ARRAY['owner', 'admin']))
WITH CHECK (public.has_organization_role(id, ARRAY['owner', 'admin']));

CREATE POLICY organizations_delete ON public.organizations
FOR DELETE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY organization_members_select ON public.organization_members
FOR SELECT TO authenticated
USING (public.is_organization_member(organization_id));

CREATE POLICY organization_members_insert ON public.organization_members
FOR INSERT TO authenticated
WITH CHECK (
  public.has_organization_role(organization_id, ARRAY['owner', 'admin'])
  AND role IN ('admin', 'member', 'viewer')
);

CREATE POLICY organization_members_update ON public.organization_members
FOR UPDATE TO authenticated
USING (public.has_organization_role(organization_id, ARRAY['owner', 'admin']))
WITH CHECK (
  public.has_organization_role(organization_id, ARRAY['owner', 'admin'])
  AND role IN ('admin', 'member', 'viewer', 'owner')
);

CREATE POLICY organization_members_delete ON public.organization_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_organization_role(organization_id, ARRAY['owner', 'admin'])
);

CREATE POLICY projects_select ON public.projects
FOR SELECT TO authenticated
USING (public.is_organization_member(organization_id));

CREATE POLICY projects_insert ON public.projects
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()::TEXT
  AND public.has_organization_role(organization_id, ARRAY['owner', 'admin', 'member'])
);

CREATE POLICY projects_update ON public.projects
FOR UPDATE TO authenticated
USING (public.has_organization_role(organization_id, ARRAY['owner', 'admin', 'member']))
WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'admin', 'member']));

CREATE POLICY projects_delete ON public.projects
FOR DELETE TO authenticated
USING (public.has_organization_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY expenses_select ON public.expenses
FOR SELECT TO authenticated
USING (public.is_organization_member(organization_id));

CREATE POLICY expenses_insert ON public.expenses
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()::TEXT
  AND public.has_organization_role(organization_id, ARRAY['owner', 'admin', 'member'])
);

CREATE POLICY expenses_update ON public.expenses
FOR UPDATE TO authenticated
USING (public.has_organization_role(organization_id, ARRAY['owner', 'admin', 'member']))
WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'admin', 'member']));

CREATE POLICY expenses_delete ON public.expenses
FOR DELETE TO authenticated
USING (public.has_organization_role(organization_id, ARRAY['owner', 'admin']));

-- ---------------------------------------------------------------------
-- Integridad: un gasto debe pertenecer a la misma organización que su
-- proyecto. Se aborta ante inconsistencias para revisarlas explícitamente.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.projects p ON p.id = e.project_id
    WHERE e.organization_id IS DISTINCT FROM p.organization_id
  ) THEN
    RAISE EXCEPTION 'Hay gastos cuya organización difiere del proyecto; revisar y corregir explícitamente antes de continuar';
  END IF;
  IF EXISTS (SELECT 1 FROM public.projects WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Hay proyectos sin organization_id; corrígelos antes de continuar';
  END IF;
  IF EXISTS (SELECT 1 FROM public.expenses WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Hay gastos sin organization_id; corrígelos antes de continuar';
  END IF;
END $$;

ALTER TABLE public.projects ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_project_organization_fkey;
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_id_organization_unique;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_id_organization_unique UNIQUE (id, organization_id);

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_project_organization_fkey
  FOREIGN KEY (project_id, organization_id)
  REFERENCES public.projects (id, organization_id)
  ON DELETE CASCADE;

-- ---------------------------------------------------------------------
-- RPCs: validar siempre al solicitante y limitar exposición de emails.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(user_uuid = auth.uid(), FALSE)
    AND public.is_organization_member(org_uuid);
$$;

REVOKE ALL ON FUNCTION public.user_belongs_to_organization(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_organization(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid UUID)
RETURNS TABLE (
  org_id UUID,
  org_name VARCHAR(255),
  org_slug VARCHAR(100),
  user_role VARCHAR(50),
  is_owner BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT o.id, o.name, o.slug, om.role, o.owner_id = auth.uid()
  FROM public.organizations o
  JOIN public.organization_members om ON om.organization_id = o.id
  WHERE user_uuid = auth.uid()
    AND om.user_id = auth.uid()
  ORDER BY om.joined_at DESC;
$$;

DROP FUNCTION IF EXISTS public.get_user_id_by_email(TEXT);
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT, org_id UUID)
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id, u.email::TEXT
  FROM auth.users u
  WHERE public.has_organization_role(org_id, ARRAY['owner', 'admin'])
    AND lower(u.email) = lower(user_email)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids UUID[])
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT u.id, u.email::TEXT
  FROM auth.users u
  JOIN public.organization_members target_membership ON target_membership.user_id = u.id
  WHERE u.id = ANY(user_ids)
    AND public.is_organization_member(target_membership.organization_id);
$$;

CREATE OR REPLACE FUNCTION public.get_organization_members_with_emails(org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  user_email TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT om.id, om.organization_id, om.user_id, om.role::TEXT, om.joined_at, u.email::TEXT
  FROM public.organization_members om
  JOIN auth.users u ON u.id = om.user_id
  WHERE om.organization_id = org_id
    AND public.is_organization_member(org_id)
  ORDER BY om.joined_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_user_organizations(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_id_by_email(TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_emails(UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_organization_members_with_emails(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_organizations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_emails(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_members_with_emails(UUID) TO authenticated;

COMMIT;
