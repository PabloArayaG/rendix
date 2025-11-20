-- =====================================
-- FIX PARA TODOS LOS PROYECTOS DE STAGING
-- Corrige net_amount en todos los gastos y recalcula todos los proyectos
-- EJECUTAR UNA SOLA VEZ
-- =====================================

-- PASO 1: Ver estado actual de TODOS los proyectos
SELECT 
  p.custom_id,
  p.name,
  p.sale_amount as venta,
  p.real_cost as costo_actual,
  (SELECT COUNT(*) FROM expenses WHERE project_id = p.id) as num_gastos,
  (SELECT SUM(net_amount) FROM expenses WHERE project_id = p.id) as suma_neto,
  (SELECT SUM(amount) FROM expenses WHERE project_id = p.id) as suma_total
FROM projects p
ORDER BY p.created_at DESC;

-- PASO 2: Corregir TODOS los gastos que no tienen net_amount
-- Si net_amount está vacío o en 0, calcularlo desde amount
UPDATE expenses
SET 
  net_amount = CASE 
    WHEN net_amount IS NULL OR net_amount = 0 THEN
      -- Si tenemos tax_amount, calcular neto
      CASE 
        WHEN tax_amount > 0 THEN amount - tax_amount
        ELSE ROUND(amount / 1.19, 2)  -- Asumir IVA 19%
      END
    ELSE net_amount
  END,
  tax_amount = CASE
    WHEN tax_amount IS NULL OR tax_amount = 0 THEN
      amount - CASE 
        WHEN net_amount IS NULL OR net_amount = 0 THEN ROUND(amount / 1.19, 2)
        ELSE net_amount
      END
    ELSE tax_amount
  END
WHERE net_amount IS NULL OR net_amount = 0 OR tax_amount IS NULL OR tax_amount = 0;

-- PASO 3: Recalcular TODOS los proyectos usando net_amount
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

-- PASO 4: Verificar resultado final de TODOS los proyectos
SELECT 
  p.custom_id,
  p.name,
  p.sale_amount as venta_neto,
  p.real_cost as costo_neto_corregido,
  p.real_margin as margen,
  (SELECT COUNT(*) FROM expenses WHERE project_id = p.id) as num_gastos,
  (SELECT SUM(net_amount) FROM expenses WHERE project_id = p.id) as suma_neto,
  (SELECT SUM(amount) FROM expenses WHERE project_id = p.id) as suma_total
FROM projects p
ORDER BY p.created_at DESC;

-- =====================================
-- RESULTADO ESPERADO:
-- - real_cost debe ser igual a suma_neto (sin IVA)
-- - suma_total debe ser mayor que suma_neto (incluye IVA)
-- =====================================

