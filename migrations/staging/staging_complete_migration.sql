-- ========================================
-- MIGRACIÓN COMPLETA PARA STAGING
-- Ejecutar en: SQL Editor de Supabase Staging
-- ========================================

-- PARTE 1: Aumentar límites DECIMAL
-- ========================================
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

-- PARTE 2: Actualizar función de cálculo de costos reales
-- ========================================
CREATE OR REPLACE FUNCTION update_project_real_costs()
RETURNS TRIGGER AS $$
DECLARE
    project_sale_amount DECIMAL(15, 2);
    total_net_expenses DECIMAL(15, 2);
    target_project_id UUID;
BEGIN
    target_project_id := COALESCE(NEW.project_id, OLD.project_id);
    
    -- Obtener monto de venta
    SELECT sale_amount INTO project_sale_amount
    FROM projects 
    WHERE id = target_project_id;
    
    -- Si no encontramos el proyecto, salir sin error
    IF project_sale_amount IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calcular total de gastos NETOS (sin IVA)
    -- CAMBIO: Usar net_amount en lugar de amount
    SELECT COALESCE(SUM(net_amount), 0) INTO total_net_expenses
    FROM expenses 
    WHERE project_id = target_project_id;
    
    -- Actualizar proyecto con costos reales NETOS
    UPDATE projects SET
        real_cost = total_net_expenses,
        real_margin = project_sale_amount - total_net_expenses,
        updated_at = NOW()
    WHERE id = target_project_id;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- En caso de error, continuar sin fallar
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- PARTE 3: Recalcular costos reales para todos los proyectos
-- ========================================
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
    END LOOP;
END $$;

-- PARTE 4: Actualizar user_id del proyecto existente
-- ========================================
UPDATE projects
SET user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
WHERE custom_id = '2025' OR name = 'Proyecto Staging';

UPDATE expenses
SET user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE custom_id = '2025' OR name = 'Proyecto Staging'
);

-- PARTE 5: Verificar que todo funcionó correctamente
-- ========================================
SELECT 
  p.custom_id,
  p.name,
  p.client,
  p.user_id,
  p.sale_amount as venta,
  p.real_cost as costo_neto,
  p.real_margin as margen,
  (SELECT COUNT(*) FROM expenses WHERE project_id = p.id) as num_gastos,
  (SELECT SUM(net_amount) FROM expenses WHERE project_id = p.id) as suma_neto_verificacion
FROM projects p
WHERE p.user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
ORDER BY p.created_at DESC;

-- Si ves tu proyecto aquí con el user_id correcto, ¡todo está listo! 🎉

