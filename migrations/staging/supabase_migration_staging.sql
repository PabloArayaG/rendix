-- MIGRACIÓN PARA ACTUALIZAR SCHEMA DE STAGING
-- Ejecutar DESPUÉS del schema inicial para corregir diferencias

-- 1. Actualizar tabla projects para coincidir con tipos TypeScript
ALTER TABLE projects 
  -- Cambiar status values para coincidir con ProjectStatus
  DROP CONSTRAINT IF EXISTS projects_status_check,
  ADD CONSTRAINT projects_status_check CHECK (status IN ('in_progress', 'completed'));

-- Agregar columna sale_invoice que falta
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS sale_invoice VARCHAR(100);

-- 2. Actualizar tabla expenses para coincidir con tipos TypeScript
ALTER TABLE expenses 
  -- Agregar columnas que faltan
  ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'provision',
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) DEFAULT 'boleta',
  ADD COLUMN IF NOT EXISTS document_number VARCHAR(100);

-- Agregar constraints para las nuevas columnas (sin IF NOT EXISTS)
DO $$
BEGIN
    -- Agregar constraint para net_amount si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_net_amount_positive') THEN
        ALTER TABLE expenses ADD CONSTRAINT expenses_net_amount_positive CHECK (net_amount >= 0);
    END IF;
    
    -- Agregar constraint para tax_amount si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_tax_amount_positive') THEN
        ALTER TABLE expenses ADD CONSTRAINT expenses_tax_amount_positive CHECK (tax_amount >= 0);
    END IF;
    
    -- Agregar constraint para status si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_valid_status') THEN
        ALTER TABLE expenses ADD CONSTRAINT expenses_valid_status CHECK (
            status IN ('provision', 'paid', 'credit', 'advance')
        );
    END IF;
    
    -- Agregar constraint para document_type si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_valid_document_type') THEN
        ALTER TABLE expenses ADD CONSTRAINT expenses_valid_document_type CHECK (
            document_type IN ('boleta', 'factura')
        );
    END IF;
END $$;

-- 3. Actualizar función para recalcular costos (incluir net_amount y tax_amount)
CREATE OR REPLACE FUNCTION update_project_real_costs()
RETURNS TRIGGER AS $$
DECLARE
    project_sale_amount DECIMAL(12, 2);
    total_expenses DECIMAL(12, 2);
BEGIN
    -- Obtener el monto de venta del proyecto
    SELECT sale_amount INTO project_sale_amount
    FROM projects 
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    -- Calcular total de gastos (usar amount que incluye impuestos)
    SELECT COALESCE(SUM(amount), 0) INTO total_expenses
    FROM expenses 
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
    
    -- Actualizar proyecto con costos reales
    UPDATE projects SET
        real_cost = total_expenses,
        real_margin = project_sale_amount - total_expenses,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para auto-calcular net_amount y tax_amount si no se proporcionan
CREATE OR REPLACE FUNCTION calculate_expense_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Si net_amount o tax_amount no están definidos, calcularlos
    -- Asumiendo IVA del 19% en Chile
    IF NEW.net_amount = 0 OR NEW.net_amount IS NULL THEN
        NEW.net_amount := ROUND(NEW.amount / 1.19, 2);
    END IF;
    
    IF NEW.tax_amount = 0 OR NEW.tax_amount IS NULL THEN
        NEW.tax_amount := NEW.amount - NEW.net_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_expense_amounts
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_expense_amounts();

-- 5. Actualizar datos existentes (si los hay)
UPDATE projects SET status = 'in_progress' WHERE status = 'active';

-- Calcular net_amount y tax_amount para gastos existentes
UPDATE expenses 
SET 
    net_amount = ROUND(amount / 1.19, 2),
    tax_amount = amount - ROUND(amount / 1.19, 2)
WHERE net_amount = 0 OR net_amount IS NULL;

-- 6. Verificar que todo funciona
SELECT 'Migration completed successfully!' as status;

-- Mostrar estructura actualizada
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('projects', 'expenses')
ORDER BY table_name, ordinal_position;
