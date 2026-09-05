-- Verificación posterior a setup_storage_receipts.sql.
-- Solo lectura: no modifica bucket, objetos, políticas ni referencias.

BEGIN TRANSACTION READ ONLY;

WITH expected_policies(policyname) AS (
  VALUES
    ('receipts_select_policy'),
    ('receipts_insert_policy'),
    ('receipts_update_policy'),
    ('receipts_delete_policy')
), policy_state AS (
  SELECT
    count(*) FILTER (WHERE p.policyname IN (SELECT policyname FROM expected_policies)) AS expected_count,
    count(*) FILTER (
      WHERE p.policyname IN (
        'Users can upload their own receipts',
        'Users can view their own receipts',
        'Users can update their own receipts',
        'Users can delete their own receipts'
      )
    ) AS legacy_count
  FROM pg_policies p
  WHERE p.schemaname = 'storage'
    AND p.tablename = 'objects'
), object_state AS (
  SELECT
    count(*) AS total,
    count(*) FILTER (
      WHERE (storage.foldername(o.name))[1] IN ('receipts', 'projects')
        AND (storage.foldername(o.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ) AS compatible
  FROM storage.objects o
  WHERE o.bucket_id = 'receipts'
)
SELECT check_name, passed, details
FROM (
  SELECT
    1 AS sort_order,
    'bucket receipts privado' AS check_name,
    EXISTS (
      SELECT 1 FROM storage.buckets
      WHERE id = 'receipts'
        AND public = FALSE
        AND file_size_limit = 5242880
    ) AS passed,
    COALESCE((
      SELECT format('public=%s, limit=%s', public, file_size_limit)
      FROM storage.buckets WHERE id = 'receipts'
    ), 'bucket ausente') AS details

  UNION ALL

  SELECT
    2,
    '4 políticas privadas exactas',
    expected_count = 4 AND legacy_count = 0,
    format('nuevas=%s, antiguas=%s', expected_count, legacy_count)
  FROM policy_state

  UNION ALL

  SELECT
    3,
    'helper de Storage protegido',
    COALESCE(p.prosecdef, FALSE)
      AND COALESCE(p.proconfig @> ARRAY['search_path=public, pg_temp'], FALSE)
      AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE'),
    CASE
      WHEN p.oid IS NULL THEN 'función ausente'
      ELSE format(
        'security_definer=%s, anon=%s, authenticated=%s, config=%s',
        p.prosecdef,
        has_function_privilege('anon', p.oid, 'EXECUTE'),
        has_function_privilege('authenticated', p.oid, 'EXECUTE'),
        array_to_string(p.proconfig, ', ')
      )
    END
  FROM (SELECT to_regprocedure('public.can_access_project_storage(text,boolean)') AS oid) r
  LEFT JOIN pg_proc p ON p.oid = r.oid

  UNION ALL

  SELECT
    4,
    'objetos conservados y compatibles',
    total = compatible,
    format('total=%s, compatibles=%s', total, compatible)
  FROM object_state
) checks
ORDER BY sort_order;

COMMIT;
