-- Comprobación previa a convertir el bucket receipts en privado.
-- Solo lectura; no muestra nombres ni contenido de archivos.

BEGIN TRANSACTION READ ONLY;

WITH receipt_objects AS (
  SELECT
    o.name,
    (storage.foldername(o.name))[1] AS path_type,
    CASE
      WHEN (storage.foldername(o.name))[1] IN ('receipts', 'projects')
       AND (storage.foldername(o.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN ((storage.foldername(o.name))[2])::UUID
      ELSE NULL
    END AS project_id
  FROM storage.objects o
  WHERE o.bucket_id = 'receipts'
), document_references AS (
  SELECT receipt_url AS stored_value
  FROM public.expenses
  WHERE receipt_url IS NOT NULL AND receipt_url <> ''
  UNION ALL
  SELECT purchase_order_url FROM public.projects WHERE purchase_order_url IS NOT NULL AND purchase_order_url <> ''
  UNION ALL
  SELECT hes_url FROM public.projects WHERE hes_url IS NOT NULL AND hes_url <> ''
  UNION ALL
  SELECT sale_invoice_url FROM public.projects WHERE sale_invoice_url IS NOT NULL AND sale_invoice_url <> ''
)
SELECT jsonb_build_object(
  'bucket', (
    SELECT jsonb_build_object(
      'exists', count(*) = 1,
      'public', COALESCE(bool_or(public), FALSE),
      'file_size_limit', max(file_size_limit)
    )
    FROM storage.buckets
    WHERE id = 'receipts'
  ),
  'objects', (
    SELECT jsonb_build_object(
      'total', count(*),
      'compatible_paths', count(*) FILTER (WHERE project_id IS NOT NULL),
      'incompatible_paths', count(*) FILTER (WHERE project_id IS NULL),
      'orphan_project_paths', count(*) FILTER (
        WHERE project_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = receipt_objects.project_id)
      ),
      'expense_paths', count(*) FILTER (WHERE path_type = 'receipts'),
      'project_document_paths', count(*) FILTER (WHERE path_type = 'projects')
    )
    FROM receipt_objects
  ),
  'database_references', (
    SELECT jsonb_build_object(
      'total', count(*),
      'public_urls', count(*) FILTER (WHERE stored_value LIKE '%/storage/v1/object/public/receipts/%'),
      'stored_paths', count(*) FILTER (WHERE stored_value NOT LIKE 'http%')
    )
    FROM document_references
  ),
  'known_storage_policies', (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'receipts_select_policy',
        'receipts_insert_policy',
        'receipts_update_policy',
        'receipts_delete_policy',
        'Users can upload their own receipts',
        'Users can view their own receipts',
        'Users can update their own receipts',
        'Users can delete their own receipts'
      )
  )
) AS storage_preflight;

COMMIT;
