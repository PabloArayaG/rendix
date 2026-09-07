-- Ajuste posterior para entornos donde harden_multitenancy.sql ya fue aplicado.
-- La FK compuesta conserva la integridad y el ON DELETE CASCADE; la FK simple
-- es redundante y provoca dos relaciones expenses -> projects en PostgREST.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.expenses'::regclass
      AND conname = 'expenses_project_organization_fkey'
      AND contype = 'f'
  ) THEN
    RAISE EXCEPTION 'Falta expenses_project_organization_fkey; no se eliminará la FK simple';
  END IF;
END $$;

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_project_id_fkey;

COMMIT;
