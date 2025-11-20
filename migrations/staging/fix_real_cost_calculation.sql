-- Fix para mostrar Costo Real NETO (sin IVA)
-- Cambiar el cálculo de real_cost de SUM(amount) a SUM(net_amount)
-- Esto hace que el costo real sea solo el neto, sin incluir IVA

-- 1. Recrear función para calcular costos reales usando net_amount
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

-- 2. No necesitamos recrear los triggers, solo la función
-- Los triggers ya existentes seguirán funcionando

-- 3. Recalcular costos reales para todos los proyectos existentes
-- Esto actualizará los valores históricos
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

-- 4. Verificar los cambios
SELECT 
    p.custom_id,
    p.name,
    p.sale_amount as venta,
    p.real_cost as costo_neto,
    p.real_margin as margen,
    (SELECT COUNT(*) FROM expenses WHERE project_id = p.id) as num_gastos,
    (SELECT SUM(net_amount) FROM expenses WHERE project_id = p.id) as suma_neto_verificacion
FROM projects p
ORDER BY p.created_at DESC
LIMIT 5;
