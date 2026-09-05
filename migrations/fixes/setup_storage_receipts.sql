-- ============================================================
-- STORAGE PRIVADO: comprobantes y documentos de proyectos
-- Ejecutar en Supabase después de la migración de organizaciones.
-- ============================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

-- Limpiar todas las variantes de políticas anteriores para evitar que se
-- combinen de forma permisiva con las nuevas.
DROP POLICY IF EXISTS "receipts_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;

-- Los paths actuales son receipts/<project_id>/... y projects/<project_id>/...
-- En ambos casos el UUID del proyecto es el segundo segmento.
CREATE OR REPLACE FUNCTION public.can_access_project_storage(
  object_name TEXT,
  require_write BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.organization_members om
      ON om.organization_id = p.organization_id
    WHERE p.id = CASE
      WHEN (storage.foldername(object_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN ((storage.foldername(object_name))[2])::UUID
      ELSE NULL
    END
      AND om.user_id = auth.uid()
      AND (NOT require_write OR om.role IN ('owner', 'admin', 'member'))
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_project_storage(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_project_storage(TEXT, BOOLEAN) TO authenticated;

CREATE POLICY "receipts_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.can_access_project_storage(name, FALSE)
);

CREATE POLICY "receipts_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND public.can_access_project_storage(name, TRUE)
);

CREATE POLICY "receipts_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.can_access_project_storage(name, TRUE)
)
WITH CHECK (
  bucket_id = 'receipts'
  AND public.can_access_project_storage(name, TRUE)
);

CREATE POLICY "receipts_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.can_access_project_storage(name, TRUE)
);

COMMIT;
