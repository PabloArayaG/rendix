-- Script para actualizar el user_id del proyecto en staging
-- Esto vinculará el proyecto existente a tu cuenta actual

-- Actualizar el proyecto "Proyecto Staging" para que pertenezca a tu usuario
UPDATE projects
SET user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
WHERE custom_id = '2025' OR name = 'Proyecto Staging';

-- Actualizar también los gastos asociados (si existen)
UPDATE expenses
SET user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE custom_id = '2025' OR name = 'Proyecto Staging'
);

-- Verificar que se actualizó correctamente
SELECT 
  custom_id,
  name,
  client,
  user_id,
  sale_amount,
  real_cost
FROM projects
WHERE user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654';

