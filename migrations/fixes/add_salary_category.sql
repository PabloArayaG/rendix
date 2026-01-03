-- ========================================
-- AGREGAR CATEGORÍA "SALARY" (Sueldos)
-- ========================================
-- Ejecutar en: SQL Editor de Supabase (STAGING y luego PRODUCCIÓN)
-- ========================================

-- Si la columna category tiene un CHECK constraint, necesitamos eliminarlo y recrearlo
-- O si usa un ENUM type, necesitamos agregar el valor

-- OPCIÓN 1: Si usa CHECK constraint
-- ========================================

-- Primero, ver el constraint actual
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'expenses'::regclass 
AND contype = 'c'
AND conname LIKE '%category%';

-- Eliminar el constraint viejo (si existe)
ALTER TABLE expenses 
DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Crear nuevo constraint CON 'salary'
ALTER TABLE expenses
ADD CONSTRAINT expenses_category_check 
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

-- Verificar
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'expenses'::regclass 
AND contype = 'c'
AND conname LIKE '%category%';

-- ========================================
-- ✅ LISTO
-- ========================================
-- La categoría 'salary' (Sueldos) ahora está disponible
-- ========================================

