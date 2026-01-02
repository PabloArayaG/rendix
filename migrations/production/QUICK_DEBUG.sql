-- ========================================
-- DEBUG RÁPIDO: Ver estado actual
-- ========================================

-- 1. ¿Cuántos usuarios hay?
SELECT COUNT(*) as total_usuarios FROM auth.users;

-- 2. ¿Cuántas organizaciones hay?
SELECT COUNT(*) as total_organizaciones FROM organizations;

-- 3. ¿Cuántos miembros hay?
SELECT COUNT(*) as total_miembros FROM organization_members;

-- 4. ¿Los proyectos tienen organization_id?
SELECT 
  COUNT(*) as total_proyectos,
  COUNT(organization_id) as proyectos_con_org,
  COUNT(*) - COUNT(organization_id) as proyectos_sin_org
FROM projects;

-- 5. Ver organizaciones con miembros
SELECT 
  o.name as organizacion,
  COUNT(om.id) as cantidad_miembros
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
GROUP BY o.id, o.name;

-- 6. Ver un usuario específico y sus organizaciones
-- Reemplaza con el email de tu usuario
SELECT 
  u.id as user_id,
  u.email,
  (SELECT COUNT(*) FROM organization_members WHERE user_id = u.id) as organizaciones
FROM auth.users u
WHERE email = 'michele.gonzalez@solidpro.cl'; -- CAMBIAR POR TU EMAIL

-- 7. Probar si el usuario puede ver las organizaciones
-- Primero obtén tu user_id del query anterior, luego:
-- SELECT * FROM get_user_organizations('TU_USER_ID_AQUI');

