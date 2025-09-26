-- ACTUALIZACIÓN DE MONEDA DE EUR A CLP
-- Ejecutar en Supabase SQL Editor para convertir los datos existentes

-- Actualizar proyectos existentes (convertir EUR a CLP aproximadamente 1 EUR = 1000 CLP)
UPDATE projects 
SET 
    sale_amount = sale_amount * 1000,
    projected_cost = projected_cost * 1000,
    projected_margin = projected_margin * 1000,
    real_cost = real_cost * 1000,
    real_margin = real_margin * 1000
WHERE sale_amount > 0 OR projected_cost > 0 OR real_cost > 0;

-- Actualizar gastos existentes (convertir EUR a CLP aproximadamente 1 EUR = 1000 CLP)
UPDATE expenses 
SET amount = amount * 1000
WHERE amount > 0;

-- Verificar la actualización
SELECT 
    'projects' as tabla,
    COUNT(*) as registros_actualizados,
    AVG(sale_amount) as promedio_venta_clp,
    AVG(real_cost) as promedio_costo_clp
FROM projects

UNION ALL

SELECT 
    'expenses' as tabla,
    COUNT(*) as registros_actualizados,
    AVG(amount) as promedio_monto_clp,
    0 as promedio_costo_clp
FROM expenses;

-- Comentario sobre la conversión
SELECT 'Conversión completada: EUR a CLP (factor 1000x)' as status;
