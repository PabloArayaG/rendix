-- MIGRACIÓN SEGURA PARA STAGING - Versión 3
-- Deshabilitar triggers temporalmente durante la migración

-- 1. Deshabilitar triggers temporalmente
ALTER TABLE expenses DISABLE TRIGGER ALL;
ALTER TABLE projects DISABLE TRIGGER ALL;

-- 2. Actualizar datos existentes ANTES de cambiar constraints
UPDATE projects SET status = 'in_progress' WHERE status = 'active';
UPDATE projects SET status = 'in_progress' WHERE status NOT IN ('in_progress', 'completed');

-- 3. Eliminar constraint existente y crear uno nuevo
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('in_progress', 'completed'));

-- 4. Agregar columna sale_invoice que falta
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'sale_invoice') THEN
        ALTER TABLE projects ADD COLUMN sale_invoice VARCHAR(100);
    END IF;
END $$;

-- 5. Actualizar tabla expenses para coincidir con tipos TypeScript
DO $$
BEGIN
    -- Agregar columnas que faltan una por una
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'expenses' AND column_name = 'net_amount') THEN
        ALTER TABLE expenses ADD COLUMN net_amount DECIMAL(10, 2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'expenses' AND column_name = 'tax_amount') THEN
        ALTER TABLE expenses ADD COLUMN tax_amount DECIMAL(10, 2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'expenses' AND column_name = 'status') THEN
        ALTER TABLE expenses ADD COLUMN status VARCHAR(50) DEFAULT 'provision';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'expenses' AND column_name = 'document_type') THEN
        ALTER TABLE expenses ADD COLUMN document_type VARCHAR(20) DEFAULT 'boleta';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'expenses' AND column_name = 'document_number') THEN
        ALTER TABLE expenses ADD COLUMN document_number VARCHAR(100);
    END IF;
END $$;

-- 6. Calcular net_amount y tax_amount para gastos existentes
UPDATE expenses 
SET 
    net_amount = CASE WHEN net_amount = 0 OR net_amount IS NULL 
                     THEN ROUND(amount / 1.19, 2) 
                     ELSE net_amount END,
    tax_amount = CASE WHEN tax_amount = 0 OR tax_amount IS NULL 
                     THEN amount - ROUND(amount / 1.19, 2) 
                     ELSE tax_amount END;

-- 7. Agregar constraints para expenses
DO $$
BEGIN
    -- Eliminar constraints existentes si existen
    ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_net_amount_positive;
    ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_tax_amount_positive;
    ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_valid_status;
    ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_valid_document_type;
    
    -- Crear constraints nuevos
    ALTER TABLE expenses ADD CONSTRAINT expenses_net_amount_positive CHECK (net_amount >= 0);
    ALTER TABLE expenses ADD CONSTRAINT expenses_tax_amount_positive CHECK (tax_amount >= 0);
    ALTER TABLE expenses ADD CONSTRAINT expenses_valid_status CHECK (
        status IN ('provision', 'paid', 'credit', 'advance')
    );
    ALTER TABLE expenses ADD CONSTRAINT expenses_valid_document_type CHECK (
        document_type IN ('boleta', 'factura')
    );
END $$;

-- 8. Recrear función para recalcular costos (versión mejorada)
CREATE OR REPLACE FUNCTION update_project_real_costs()
RETURNS TRIGGER AS $$
DECLARE
    project_sale_amount DECIMAL(12, 2);
    total_expenses DECIMAL(12, 2);
    target_project_id UUID;
BEGIN
    target_project_id := COALESCE(NEW.project_id, OLD.project_id);
    
    -- Obtener el monto de venta del proyecto
    SELECT sale_amount INTO project_sale_amount
    FROM projects 
    WHERE id = target_project_id;
    
    -- Si no encontramos el proyecto, salir
    IF project_sale_amount IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calcular total de gastos
    SELECT COALESCE(SUM(amount), 0) INTO total_expenses
    FROM expenses 
    WHERE project_id = target_project_id;
    
    -- Actualizar proyecto con costos reales
    UPDATE projects SET
        real_cost = total_expenses,
        real_margin = project_sale_amount - total_expenses,
        updated_at = NOW()
    WHERE id = target_project_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 9. Recrear función para calcular amounts
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

-- 10. Recrear triggers
DROP TRIGGER IF EXISTS trigger_calculate_expense_amounts ON expenses;
CREATE TRIGGER trigger_calculate_expense_amounts
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_expense_amounts();

-- 11. Rehabilitar triggers
ALTER TABLE projects ENABLE TRIGGER ALL;
ALTER TABLE expenses ENABLE TRIGGER ALL;

-- 12. Verificar que todo funciona
SELECT 'Migration completed successfully!' as status;

-- Mostrar datos actuales
SELECT 'Projects status distribution:' as info;
SELECT status, COUNT(*) as count FROM projects GROUP BY status;

SELECT 'Sample project data:' as info;
SELECT id, custom_id, name, status, sale_amount, real_cost, real_margin 
FROM projects LIMIT 3;
