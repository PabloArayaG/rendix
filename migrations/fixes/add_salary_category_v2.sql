-- ========================================
-- DIAGNÓSTICO Y FIX: Agregar categoría "salary"
-- ========================================
-- Ejecutar paso a paso en SQL Editor
-- ========================================

-- PASO 1: Ver el tipo de dato de la columna category
-- ========================================
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'expenses' 
AND column_name = 'category';

-- PASO 2: Ver todos los constraints de la columna category
-- ========================================
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'expenses'::regclass 
AND contype = 'c'
ORDER BY conname;

-- ========================================
-- SOLUCIÓN 1: Si es CHECK constraint
-- ========================================

-- Eliminar TODOS los constraints de category
DO $$ 
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'expenses'::regclass 
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE expenses DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE 'Constraint % eliminado', constraint_name;
  END LOOP;
END $$;

-- Crear nuevo constraint con salary incluido
ALTER TABLE expenses
ADD CONSTRAINT expenses_valid_category 
CHECK (category IN (
  'materials',
  'labor',
  'equipment',
  'transport',
  'services',
  'permits',
  'utilities',
  'insurance',
  'supplies',
  'subcontractors',
  'tools',
  'safety',
  'administration',
  'salary',
  'food',
  'accommodation',
  'fuel',
  'other',
  'general'
));

-- ========================================
-- Verificar que se creó correctamente
-- ========================================
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'expenses'::regclass 
AND contype = 'c'
AND conname = 'expenses_valid_category';

-- ========================================
-- PROBAR: Intentar insertar un valor de prueba
-- ========================================
-- (Solo para verificar, no lo ejecutes si no quieres crear un gasto de prueba)
/*
INSERT INTO expenses (
  description, 
  category, 
  net_amount, 
  tax_amount, 
  amount, 
  date,
  status,
  document_type,
  project_id,
  user_id,
  organization_id
) VALUES (
  'Test Sueldo',
  'salary',
  1000000,
  190000,
  1190000,
  CURRENT_DATE,
  'provision',
  'boleta',
  (SELECT id FROM projects LIMIT 1),
  auth.uid(),
  (SELECT organization_id FROM projects LIMIT 1)
);

-- Si lo insertaste, eliminarlo:
DELETE FROM expenses WHERE description = 'Test Sueldo';
*/

-- ========================================
-- ✅ FIN DEL SCRIPT
-- ========================================

