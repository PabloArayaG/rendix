-- SCRIPT DE DEBUG Y FIX PARA STAGING
-- Ejecutar paso a paso para diagnosticar el problema

-- =====================================
-- PASO 1: VERIFICAR DATOS ACTUALES
-- =====================================
-- Ver el proyecto y sus gastos
SELECT 
  'PROYECTO' as tipo,
  p.custom_id,
  p.name,
  p.sale_amount,
  p.real_cost,
  p.real_margin,
  p.user_id
FROM projects p
WHERE p.custom_id = '0101001' OR p.name LIKE '%Prueba%'
UNION ALL
SELECT 
  'GASTO' as tipo,
  e.description as custom_id,
  e.supplier as name,
  e.amount as sale_amount,
  e.net_amount as real_cost,
  e.tax_amount as real_margin,
  e.user_id
FROM expenses e
WHERE e.project_id IN (SELECT id FROM projects WHERE custom_id = '0101001' OR name LIKE '%Prueba%');

-- =====================================
-- PASO 2: VERIFICAR ESTRUCTURA DE COLUMNAS
-- =====================================
SELECT 
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses' 
  AND column_name IN ('amount', 'net_amount', 'tax_amount')
ORDER BY ordinal_position;

-- =====================================
-- PASO 3: CORREGIR SI net_amount ESTÁ VACÍO O INCORRECTO
-- =====================================
-- Si el gasto tiene amount pero no net_amount, calcularlo
UPDATE expenses e
SET 
  net_amount = CASE 
    WHEN net_amount IS NULL OR net_amount = 0 THEN
      -- Si tenemos tax_amount, calcular neto
      CASE 
        WHEN tax_amount > 0 THEN amount - tax_amount
        ELSE amount / 1.19  -- Asumir IVA 19%
      END
    ELSE net_amount
  END,
  tax_amount = CASE
    WHEN tax_amount IS NULL OR tax_amount = 0 THEN
      amount - net_amount
    ELSE tax_amount
  END
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE custom_id = '0101001' OR name LIKE '%Prueba%'
);

-- =====================================
-- PASO 4: FORZAR RECÁLCULO MANUAL DEL PROYECTO
-- =====================================
UPDATE projects p
SET 
  real_cost = (
    SELECT COALESCE(SUM(net_amount), 0) 
    FROM expenses 
    WHERE project_id = p.id
  ),
  real_margin = p.sale_amount - (
    SELECT COALESCE(SUM(net_amount), 0) 
    FROM expenses 
    WHERE project_id = p.id
  ),
  updated_at = NOW()
WHERE p.custom_id = '0101001' OR p.name LIKE '%Prueba%';

-- =====================================
-- PASO 5: VERIFICAR RESULTADO FINAL
-- =====================================
SELECT 
  p.custom_id as proyecto_id,
  p.name as proyecto,
  p.sale_amount as venta_neto,
  p.real_cost as costo_neto_calculado,
  p.real_margin as margen,
  (SELECT COUNT(*) FROM expenses WHERE project_id = p.id) as num_gastos,
  (SELECT SUM(net_amount) FROM expenses WHERE project_id = p.id) as suma_gastos_neto,
  (SELECT SUM(amount) FROM expenses WHERE project_id = p.id) as suma_gastos_total
FROM projects p
WHERE p.custom_id = '0101001' OR p.name LIKE '%Prueba%';

-- =====================================
-- RESULTADO ESPERADO:
-- - venta_neto: 18,000,000
-- - costo_neto_calculado: 380,000
-- - margen: 17,620,000
-- - suma_gastos_neto: 380,000
-- - suma_gastos_total: 452,200
-- =====================================

