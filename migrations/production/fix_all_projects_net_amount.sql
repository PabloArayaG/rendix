-- =====================================
-- FIX PARA TODOS LOS PROYECTOS DE PRODUCCIÓN
-- Corrige net_amount en todos los gastos y recalcula todos los proyectos
-- EJECUTAR UNA SOLA VEZ EN PRODUCCIÓN
-- =====================================

-- PASO 1: Ver estado actual de TODOS los proyectos en producción
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

-- PASO 2: Asegurar que las columnas tienen el tamaño correcto (DECIMAL 15,2)
ALTER TABLE expenses 
  ALTER COLUMN amount TYPE DECIMAL(15, 2),
  ALTER COLUMN net_amount TYPE DECIMAL(15, 2),
  ALTER COLUMN tax_amount TYPE DECIMAL(15, 2);

ALTER TABLE projects 
  ALTER COLUMN sale_amount TYPE DECIMAL(15, 2),
  ALTER COLUMN projected_cost TYPE DECIMAL(15, 2),
  ALTER COLUMN real_cost TYPE DECIMAL(15, 2),
  ALTER COLUMN projected_margin TYPE DECIMAL(15, 2),
  ALTER COLUMN real_margin TYPE DECIMAL(15, 2);

-- PASO 3: Corregir TODOS los gastos que no tienen net_amount o tax_amount
UPDATE expenses
SET 
  net_amount = CASE 
    WHEN net_amount IS NULL OR net_amount = 0 THEN
      CASE 
        WHEN tax_amount > 0 THEN amount - tax_amount
        ELSE ROUND(amount / 1.19, 2)
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

-- PASO 4: Actualizar función para calcular costos usando net_amount
CREATE OR REPLACE FUNCTION update_project_real_costs()
RETURNS TRIGGER AS $$
DECLARE
    project_sale_amount DECIMAL(15, 2);
    total_net_expenses DECIMAL(15, 2);
    target_project_id UUID;
BEGIN
    target_project_id := COALESCE(NEW.project_id, OLD.project_id);
    
    SELECT sale_amount INTO project_sale_amount
    FROM projects 
    WHERE id = target_project_id;
    
    IF project_sale_amount IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- CALCULAR USANDO NET_AMOUNT (SIN IVA)
    SELECT COALESCE(SUM(net_amount), 0) INTO total_net_expenses
    FROM expenses 
    WHERE project_id = target_project_id;
    
    UPDATE projects SET
        real_cost = total_net_expenses,
        real_margin = project_sale_amount - total_net_expenses,
        updated_at = NOW()
    WHERE id = target_project_id;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- PASO 5: Recalcular TODOS los proyectos de producción
DO $$
DECLARE
    project_record RECORD;
    total_net DECIMAL(15, 2);
BEGIN
    FOR project_record IN SELECT id, sale_amount FROM projects LOOP
        SELECT COALESCE(SUM(net_amount), 0) INTO total_net
        FROM expenses
        WHERE project_id = project_record.id;
        
        UPDATE projects
        SET 
            real_cost = total_net,
            real_margin = project_record.sale_amount - total_net,
            updated_at = NOW()
        WHERE id = project_record.id;
        
        RAISE NOTICE 'Proyecto % actualizado: real_cost = %', project_record.id, total_net;
    END LOOP;
END $$;

-- PASO 6: Verificar resultado final de TODOS los proyectos
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
-- RESULTADO ESPERADO PARA "TOLVA CAIDAS":
-- - venta_neto: $450.000
-- - costo_neto_corregido: $213.500 (antes era $254.065)
-- - margen: $236.500
-- - suma_neto: $213.500
-- - suma_total: $254.065
-- =====================================

