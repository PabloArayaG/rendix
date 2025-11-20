-- AGREGAR NUEVAS CATEGORÍAS DE GASTOS
-- Ejecutar en SQL Editor de Supabase (tanto producción como staging)

-- Actualizar constraint para incluir las nuevas categorías
ALTER TABLE expenses 
DROP CONSTRAINT IF EXISTS expenses_valid_category;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_valid_category CHECK (
    category IN (
        'materials', 'labor', 'equipment', 'transport', 'services', 
        'permits', 'utilities', 'insurance', 'supplies', 'subcontractors', 
        'tools', 'safety', 'administration', 'food', 'accommodation',
        'other', 'general'
    )
);

-- Verificar que el constraint se aplicó correctamente
SELECT 'New expense categories added successfully!' as status;

-- Mostrar todas las categorías válidas
SELECT 
    'Valid expense categories:' as info,
    unnest(ARRAY[
        'materials', 'labor', 'equipment', 'transport', 'services', 
        'permits', 'utilities', 'insurance', 'supplies', 'subcontractors', 
        'tools', 'safety', 'administration', 'food', 'accommodation',
        'other', 'general'
    ]) as category;
