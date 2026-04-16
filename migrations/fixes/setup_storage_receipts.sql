-- ============================================================
-- SETUP STORAGE: Bucket "receipts" para comprobantes de gastos
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Crear el bucket (si no existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,                              -- público: las URLs funcionan sin autenticación
  5242880,                           -- límite: 5 MB por archivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];


-- 2. Eliminar políticas anteriores si existen (evita conflictos)
DROP POLICY IF EXISTS "receipts_select_policy"  ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert_policy"  ON storage.objects;
DROP POLICY IF EXISTS "receipts_update_policy"  ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete_policy"  ON storage.objects;


-- 3. Políticas RLS para storage.objects

-- SELECT: cualquier usuario autenticado puede ver comprobantes de su organización
CREATE POLICY "receipts_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');

-- INSERT: solo usuarios autenticados pueden subir archivos
CREATE POLICY "receipts_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- UPDATE: solo usuarios autenticados pueden reemplazar archivos
CREATE POLICY "receipts_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts');

-- DELETE: solo usuarios autenticados pueden eliminar archivos
CREATE POLICY "receipts_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');
