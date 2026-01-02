-- ========================================
-- MIGRACIÓN PRODUCCIÓN: SISTEMA DE ORGANIZACIONES
-- ========================================
-- Ejecutar en: SQL Editor de Supabase PRODUCCIÓN
-- ⚠️  IMPORTANTE: Este script es seguro y NO borra datos existentes
-- ========================================

-- PARTE 1: Crear tablas de organizaciones
-- ========================================

-- Tabla principal de organizaciones
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly name
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata opcional
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Índices para organizaciones
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Tabla de miembros de organizaciones
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Evitar duplicados: un usuario solo puede estar una vez en una organización
  UNIQUE(organization_id, user_id)
);

-- Índices para miembros
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

-- PARTE 2: Agregar organization_id a tablas existentes
-- ========================================

-- Agregar a proyectos (nullable por ahora, lo haremos NOT NULL después de migrar)
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Agregar a gastos
ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization ON expenses(organization_id);

-- PARTE 3: Funciones helper
-- ========================================

-- Función para obtener las organizaciones de un usuario
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE (
  org_id UUID,
  org_name VARCHAR(255),
  org_slug VARCHAR(100),
  user_role VARCHAR(50),
  is_owner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    om.role,
    (o.owner_id = user_uuid) as is_owner
  FROM organizations o
  INNER JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = user_uuid
  ORDER BY om.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario pertenece a una organización
CREATE OR REPLACE FUNCTION user_belongs_to_organization(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el user_id por email
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS TABLE (user_id UUID, email TEXT) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::TEXT as email
  FROM auth.users u
  WHERE u.email = user_email
  LIMIT 1;
END;
$$;

-- Función para obtener emails de múltiples usuarios
CREATE OR REPLACE FUNCTION get_user_emails(user_ids UUID[])
RETURNS TABLE (user_id UUID, email TEXT) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::TEXT as email
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Función para obtener información completa de miembros con emails
CREATE OR REPLACE FUNCTION get_organization_members_with_emails(org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  user_email TEXT
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    om.id,
    om.organization_id,
    om.user_id,
    om.role::TEXT,
    om.joined_at,
    u.email::TEXT as user_email
  FROM organization_members om
  JOIN auth.users u ON u.id = om.user_id
  WHERE om.organization_id = org_id
  ORDER BY om.joined_at DESC;
END;
$$;

-- PARTE 4: Triggers y funciones adicionales
-- ========================================

-- Trigger para actualizar updated_at en organizations
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_organizations_updated_at ON organizations;
CREATE TRIGGER trigger_update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- Trigger para agregar automáticamente al owner como miembro cuando se crea una org
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_add_owner_as_member ON organizations;
CREATE TRIGGER trigger_add_owner_as_member
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_member();

-- PARTE 5: Actualizar políticas RLS
-- ========================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA ORGANIZATIONS

-- Ver organizaciones: solo las que perteneces
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" 
  ON organizations FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members WHERE organization_id = id
    )
  );

-- Crear organizaciones: cualquier usuario autenticado
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations" 
  ON organizations FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

-- Actualizar organizaciones: solo owner y admins
DROP POLICY IF EXISTS "Organization owners and admins can update" ON organizations;
CREATE POLICY "Organization owners and admins can update" 
  ON organizations FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = id 
      AND role IN ('owner', 'admin')
    )
  );

-- Eliminar organizaciones: solo owner
DROP POLICY IF EXISTS "Only owners can delete organizations" ON organizations;
CREATE POLICY "Only owners can delete organizations" 
  ON organizations FOR DELETE 
  USING (auth.uid() = owner_id);

-- POLÍTICAS PARA ORGANIZATION_MEMBERS

-- Ver miembros: solo de organizaciones donde perteneces
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
CREATE POLICY "Users can view members of their organizations" 
  ON organization_members FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members om2 
      WHERE om2.organization_id = organization_id
    )
  );

-- Agregar miembros: solo owner y admins
DROP POLICY IF EXISTS "Owners and admins can add members" ON organization_members;
CREATE POLICY "Owners and admins can add members" 
  ON organization_members FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = organization_members.organization_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Actualizar miembros: solo owner y admins
DROP POLICY IF EXISTS "Owners and admins can update members" ON organization_members;
CREATE POLICY "Owners and admins can update members" 
  ON organization_members FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members om 
      WHERE om.organization_id = organization_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Eliminar miembros: owner, admins, o el propio usuario
DROP POLICY IF EXISTS "Owners, admins, or self can remove members" ON organization_members;
CREATE POLICY "Owners, admins, or self can remove members" 
  ON organization_members FOR DELETE 
  USING (
    auth.uid() = user_id OR -- El usuario puede salirse
    auth.uid() IN (
      SELECT user_id FROM organization_members om 
      WHERE om.organization_id = organization_id 
      AND role IN ('owner', 'admin')
    )
  );

-- POLÍTICAS ACTUALIZADAS PARA PROJECTS

-- Eliminar políticas antiguas basadas en user_id
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Nuevas políticas basadas en organization_id
DROP POLICY IF EXISTS "Users can view organization projects" ON projects;
CREATE POLICY "Users can view organization projects" 
  ON projects FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = projects.organization_id
    )
  );

DROP POLICY IF EXISTS "Organization members can create projects" ON projects;
CREATE POLICY "Organization members can create projects" 
  ON projects FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = projects.organization_id
      AND role IN ('owner', 'admin', 'member') -- viewers no pueden crear
    )
  );

DROP POLICY IF EXISTS "Organization members can update projects" ON projects;
CREATE POLICY "Organization members can update projects" 
  ON projects FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = projects.organization_id
      AND role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Organization admins can delete projects" ON projects;
CREATE POLICY "Organization admins can delete projects" 
  ON projects FOR DELETE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = projects.organization_id
      AND role IN ('owner', 'admin')
    )
  );

-- POLÍTICAS ACTUALIZADAS PARA EXPENSES

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;

-- Nuevas políticas basadas en organization_id
DROP POLICY IF EXISTS "Users can view organization expenses" ON expenses;
CREATE POLICY "Users can view organization expenses" 
  ON expenses FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = expenses.organization_id
    )
  );

DROP POLICY IF EXISTS "Organization members can create expenses" ON expenses;
CREATE POLICY "Organization members can create expenses" 
  ON expenses FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = expenses.organization_id
      AND role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Organization members can update expenses" ON expenses;
CREATE POLICY "Organization members can update expenses" 
  ON expenses FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = expenses.organization_id
      AND role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Organization admins can delete expenses" ON expenses;
CREATE POLICY "Organization admins can delete expenses" 
  ON expenses FOR DELETE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = expenses.organization_id
      AND role IN ('owner', 'admin')
    )
  );

-- ========================================
-- PARTE 6: MIGRACIÓN AUTOMÁTICA DE DATOS EXISTENTES
-- ========================================
-- Esta parte detecta el usuario actual y migra todos sus datos

DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_user_email TEXT;
  v_projects_migrated INTEGER := 0;
  v_expenses_migrated INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INICIANDO MIGRACIÓN AUTOMÁTICA DE DATOS';
  RAISE NOTICE '========================================';
  
  -- Detectar el primer usuario (único usuario en producción)
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún usuario en el sistema';
  END IF;
  
  RAISE NOTICE 'Usuario detectado: % (ID: %)', v_user_email, v_user_id;
  
  -- Verificar si ya existe una organización
  SELECT id INTO v_org_id
  FROM organizations
  WHERE owner_id = v_user_id
  LIMIT 1;
  
  -- Si no existe organización, crear una
  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Creando organización por defecto...';
    
    INSERT INTO organizations (name, slug, owner_id)
    VALUES ('Mi Empresa', 'mi-empresa', v_user_id)
    RETURNING id INTO v_org_id;
    
    RAISE NOTICE '✓ Organización creada con ID: %', v_org_id;
    
    -- El trigger debería haber agregado al owner como miembro automáticamente
    -- pero verificamos por seguridad
    IF NOT EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = v_org_id AND user_id = v_user_id
    ) THEN
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (v_org_id, v_user_id, 'owner');
      RAISE NOTICE '✓ Usuario agregado como owner';
    ELSE
      RAISE NOTICE '✓ Usuario ya es miembro (por trigger)';
    END IF;
  ELSE
    RAISE NOTICE 'Organización existente encontrada: %', v_org_id;
  END IF;
  
  -- Migrar TODOS los proyectos sin organización
  -- (No filtramos por user_id para incluir proyectos de todos los usuarios)
  UPDATE projects 
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS v_projects_migrated = ROW_COUNT;
  RAISE NOTICE '✓ Proyectos migrados: %', v_projects_migrated;
  
  -- Migrar TODOS los gastos sin organización
  UPDATE expenses 
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS v_expenses_migrated = ROW_COUNT;
  RAISE NOTICE '✓ Gastos migrados: %', v_expenses_migrated;
  
  -- Agregar todos los demás usuarios como miembros de la organización
  INSERT INTO organization_members (organization_id, user_id, role)
  SELECT v_org_id, id, 'admin'
  FROM auth.users
  WHERE id != v_user_id  -- Excluir al owner que ya está agregado
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  RAISE NOTICE '✓ Otros usuarios agregados como admin';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  
END $$;

-- ========================================
-- PARTE 7: VERIFICACIÓN COMPLETA
-- ========================================

-- Ver la organización creada
SELECT 
  o.id as org_id,
  o.name as organization_name,
  o.slug,
  u.email as owner_email,
  o.created_at
FROM organizations o
JOIN auth.users u ON u.id = o.owner_id;

-- Ver todos los miembros
SELECT 
  o.name as organization,
  u.email as member_email,
  om.role,
  om.joined_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
JOIN auth.users u ON u.id = om.user_id
ORDER BY om.role DESC;

-- Resumen de la migración
SELECT 
  'Total Organizaciones' as tipo,
  COUNT(*)::TEXT as cantidad
FROM organizations
UNION ALL
SELECT 
  'Total Miembros',
  COUNT(*)::TEXT
FROM organization_members
UNION ALL
SELECT 
  'Proyectos con Organización',
  COUNT(*)::TEXT
FROM projects
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Proyectos SIN Organización',
  COUNT(*)::TEXT
FROM projects
WHERE organization_id IS NULL
UNION ALL
SELECT 
  'Gastos con Organización',
  COUNT(*)::TEXT
FROM expenses
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Gastos SIN Organización',
  COUNT(*)::TEXT
FROM expenses
WHERE organization_id IS NULL;

-- ========================================
-- ¡LISTO! 
-- ========================================
-- 
-- ✅ Sistema de organizaciones implementado
-- ✅ Datos existentes migrados automáticamente
-- ✅ Ningún dato fue borrado
-- ✅ Políticas RLS actualizadas
-- 
-- PRÓXIMOS PASOS (OPCIONAL):
-- 1. Revisar que todo esté correcto en la verificación de arriba
-- 2. Si quieres, puedes hacer organization_id obligatorio:
--    ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;
--    ALTER TABLE expenses ALTER COLUMN organization_id SET NOT NULL;
-- 
-- ========================================

