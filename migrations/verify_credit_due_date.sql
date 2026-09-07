-- Verificación posterior a fixes/add_credit_due_date.sql.
-- Solo lectura. Ejecutar en Supabase STAGING.

BEGIN TRANSACTION READ ONLY;

WITH checks AS (
  SELECT
    'columna credit_due_date'::TEXT AS check_name,
    count(*) = 1
      AND bool_and(data_type = 'date')
      AND bool_and(is_nullable = 'YES') AS passed,
    COALESCE(string_agg(data_type || ', nullable=' || is_nullable, ', '), 'no encontrada') AS details
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'expenses'
    AND column_name = 'credit_due_date'

  UNION ALL

  SELECT
    'constraint de fecha válida',
    count(*) = 1,
    COALESCE(string_agg(pg_get_constraintdef(oid), ', '), 'no encontrado')
  FROM pg_constraint
  WHERE conrelid = 'public.expenses'::regclass
    AND conname = 'expenses_credit_due_date_valid'

  UNION ALL

  SELECT
    'índice de créditos por vencer',
    count(*) = 1,
    COALESCE(string_agg(indexdef, ', '), 'no encontrado')
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'expenses'
    AND indexname = 'idx_expenses_credit_due_date'
)
SELECT check_name, passed, details
FROM checks
ORDER BY check_name;

COMMIT;
