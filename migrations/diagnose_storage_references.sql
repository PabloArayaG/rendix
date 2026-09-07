-- Diagnóstico de referencias de Storage.
-- Solo lectura: identifica objetos sin registro y registros sin objeto.

BEGIN TRANSACTION READ ONLY;

WITH raw_references AS (
  SELECT 'expenses.receipt_url'::TEXT AS source, id::TEXT AS record_id, receipt_url AS stored_value
  FROM public.expenses
  WHERE receipt_url IS NOT NULL AND receipt_url <> ''
  UNION ALL
  SELECT 'projects.purchase_order_url', id::TEXT, purchase_order_url
  FROM public.projects
  WHERE purchase_order_url IS NOT NULL AND purchase_order_url <> ''
  UNION ALL
  SELECT 'projects.hes_url', id::TEXT, hes_url
  FROM public.projects
  WHERE hes_url IS NOT NULL AND hes_url <> ''
  UNION ALL
  SELECT 'projects.sale_invoice_url', id::TEXT, sale_invoice_url
  FROM public.projects
  WHERE sale_invoice_url IS NOT NULL AND sale_invoice_url <> ''
), normalized_references AS (
  SELECT
    source,
    record_id,
    CASE
      WHEN stored_value LIKE '%/storage/v1/object/public/receipts/%'
        THEN split_part(split_part(stored_value, '/storage/v1/object/public/receipts/', 2), '?', 1)
      WHEN stored_value LIKE '%/storage/v1/object/sign/receipts/%'
        THEN split_part(split_part(stored_value, '/storage/v1/object/sign/receipts/', 2), '?', 1)
      WHEN stored_value LIKE '%/storage/v1/object/authenticated/receipts/%'
        THEN split_part(split_part(stored_value, '/storage/v1/object/authenticated/receipts/', 2), '?', 1)
      WHEN stored_value !~* '^https?://'
        THEN ltrim(split_part(stored_value, '?', 1), '/')
      ELSE NULL
    END AS object_name
  FROM raw_references
), receipt_objects AS (
  SELECT name, created_at, metadata ->> 'mimetype' AS mime_type
  FROM storage.objects
  WHERE bucket_id = 'receipts'
)
SELECT jsonb_build_object(
  'unreferenced_objects', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('name', o.name, 'created_at', o.created_at, 'mime_type', o.mime_type)
      ORDER BY o.created_at DESC
    )
    FROM receipt_objects o
    WHERE NOT EXISTS (
      SELECT 1 FROM normalized_references r WHERE r.object_name = o.name
    )
  ), '[]'::JSONB),
  'missing_objects', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('source', r.source, 'record_id', r.record_id, 'object_name', r.object_name)
    )
    FROM normalized_references r
    WHERE r.object_name IS NULL
       OR NOT EXISTS (SELECT 1 FROM receipt_objects o WHERE o.name = r.object_name)
  ), '[]'::JSONB)
) AS storage_reference_diagnostics;

COMMIT;
