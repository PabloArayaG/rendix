-- Script para corregir datos de net_amount en gastos existentes
-- Ejecutar si los gastos no tienen net_amount calculado correctamente

-- 1. Verificar el estado actual de los gastos
SELECT 
  id,
  description,
  amount as monto_total,
  net_amount as monto_neto,
  tax_amount as iva,
  project_id
FROM expenses
ORDER BY created_at DESC;

-- 2. Si net_amount está en NULL o 0, calcularlo desde amount
-- Asumiendo IVA 19%: net_amount = amount / 1.19
UPDATE expenses
SET 
  net_amount = CASE 
    WHEN net_amount IS NULL OR net_amount = 0 THEN 
      ROUND(amount / 1.19, 2)
    ELSE net_amount
  END,
  tax_amount = CASE
    WHEN tax_amount IS NULL OR tax_amount = 0 THEN
      ROUND(amount - (amount / 1.19), 2)
    ELSE tax_amount
  END
WHERE net_amount IS NULL OR net_amount = 0;

-- 3. Forzar recálculo de costos para todos los proyectos
DO $$
DECLARE
    project_record RECORD;
    total_net DECIMAL(15, 2);
BEGIN
    FOR project_record IN SELECT id, sale_amount FROM projects LOOP
        -- Calcular total neto para cada proyecto
        SELECT COALESCE(SUM(net_amount), 0) INTO total_net
        FROM expenses
        WHERE project_id = project_record.id;
        
        -- Actualizar proyecto
        UPDATE projects
        SET 
            real_cost = total_net,
            real_margin = project_record.sale_amount - total_net,
            updated_at = NOW()
        WHERE id = project_record.id;
        
        RAISE NOTICE 'Proyecto % actualizado: real_cost = %', project_record.id, total_net;
    END LOOP;
END $$;

-- 4. Verificar que los cálculos están correctos
SELECT 
  p.custom_id,
  p.name,
  p.sale_amount as venta_neto,
  p.real_cost as costo_neto,
  p.real_margin as margen,
  (SELECT COUNT(*) FROM expenses WHERE project_id = p.id) as num_gastos,
  (SELECT SUM(net_amount) FROM expenses WHERE project_id = p.id) as suma_neto,
  (SELECT SUM(amount) FROM expenses WHERE project_id = p.id) as suma_total
FROM projects p
WHERE p.user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
ORDER BY p.created_at DESC;

