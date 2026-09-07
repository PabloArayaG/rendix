-- ============================================================
-- CRÉDITOS: fecha de vencimiento y soporte para alertas
-- Ejecutar antes de desplegar el frontend que usa credit_due_date.
-- ============================================================

BEGIN;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS credit_due_date DATE;

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_credit_due_date_valid;
ALTER TABLE expenses
  ADD CONSTRAINT expenses_credit_due_date_valid
  CHECK (credit_due_date IS NULL OR credit_due_date >= date);

COMMENT ON COLUMN expenses.credit_due_date IS
  'Fecha de vencimiento del pago cuando status = credit. Puede ser NULL para datos históricos.';

CREATE INDEX IF NOT EXISTS idx_expenses_credit_due_date
  ON expenses (organization_id, credit_due_date)
  WHERE status = 'credit';

-- No se agrega NOT NULL para conservar créditos históricos. El frontend
-- exige la fecha al crear o editar un crédito y marca los antiguos como pendientes.

COMMIT;
