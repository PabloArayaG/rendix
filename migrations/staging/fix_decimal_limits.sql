-- Fix para el problema de Gerardo: Aumentar límites DECIMAL
-- De DECIMAL(10,2) a DECIMAL(15,2) para soportar montos más grandes
-- Máximo anterior: 99,999,999.99 (99 millones)
-- Máximo nuevo: 9,999,999,999,999.99 (9.9 billones)

-- Cambiar tipos de columna para soportar montos más grandes
ALTER TABLE expenses 
  ALTER COLUMN amount TYPE DECIMAL(15, 2),
  ALTER COLUMN net_amount TYPE DECIMAL(15, 2),
  ALTER COLUMN tax_amount TYPE DECIMAL(15, 2);

-- Cambiar también en la tabla projects para consistencia
ALTER TABLE projects 
  ALTER COLUMN sale_amount TYPE DECIMAL(15, 2),
  ALTER COLUMN projected_cost TYPE DECIMAL(15, 2),
  ALTER COLUMN real_cost TYPE DECIMAL(15, 2),
  ALTER COLUMN projected_margin TYPE DECIMAL(15, 2),
  ALTER COLUMN real_margin TYPE DECIMAL(15, 2);

-- Verificar que los cambios funcionaron
SELECT 
  table_name, 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale
FROM information_schema.columns 
WHERE table_name IN ('expenses', 'projects') 
  AND column_name IN ('amount', 'net_amount', 'tax_amount', 'sale_amount', 'projected_cost', 'real_cost', 'projected_margin', 'real_margin')
ORDER BY table_name, column_name;
