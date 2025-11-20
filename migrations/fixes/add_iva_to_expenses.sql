-- AGREGAR CAMPOS DE NETO E IVA A LA TABLA EXPENSES
-- Ejecutar en Supabase SQL Editor

-- Agregar nuevas columnas
ALTER TABLE expenses 
ADD COLUMN net_amount DECIMAL(10, 2),
ADD COLUMN tax_amount DECIMAL(10, 2);

-- Actualizar registros existentes (calcular neto e IVA basado en el monto total)
-- Asumiendo que los montos actuales incluyen IVA del 19%
UPDATE expenses 
SET 
    net_amount = ROUND(amount / 1.19, 0),
    tax_amount = ROUND(amount - (amount / 1.19), 0)
WHERE net_amount IS NULL;

-- Hacer los campos obligatorios después de la migración
ALTER TABLE expenses 
ALTER COLUMN net_amount SET NOT NULL,
ALTER COLUMN tax_amount SET NOT NULL;

-- Agregar constraints para validaciones
ALTER TABLE expenses 
ADD CONSTRAINT expenses_net_amount_positive CHECK (net_amount > 0),
ADD CONSTRAINT expenses_tax_amount_non_negative CHECK (tax_amount >= 0),
ADD CONSTRAINT expenses_amounts_consistent CHECK (ABS(amount - (net_amount + tax_amount)) < 1);

-- Crear función para calcular automáticamente el monto total
CREATE OR REPLACE FUNCTION calculate_expense_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se proporcionan net_amount y tax_amount, calcular amount automáticamente
    IF NEW.net_amount IS NOT NULL AND NEW.tax_amount IS NOT NULL THEN
        NEW.amount := NEW.net_amount + NEW.tax_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para calcular automáticamente el total
CREATE TRIGGER trigger_calculate_expense_total
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_expense_total();

-- Verificar la migración
SELECT 
    COUNT(*) as total_expenses,
    AVG(amount) as promedio_total,
    AVG(net_amount) as promedio_neto,
    AVG(tax_amount) as promedio_iva,
    AVG(tax_amount / net_amount * 100) as porcentaje_iva_promedio
FROM expenses;

-- Comentario
SELECT 'Migración de IVA completada exitosamente' as status;
