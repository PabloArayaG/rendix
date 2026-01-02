-- ========================================
-- DEBUG: Verificar Sistema de Organizaciones
-- ========================================
-- Ejecutar en: SQL Editor de Supabase PRODUCCIÓN
-- ========================================

-- 1. Ver todos los usuarios
SELECT 
  id,
  email,
  created_at,
  'Usuario registrado' as status
FROM auth.users
ORDER BY created_at;

-- 2. Ver todas las organizaciones
SELECT 
  o.id as org_id,
  o.name as org_name,
  o.slug,
  u.email as owner_email,
  o.created_at
FROM organizations o
LEFT JOIN auth.users u ON u.id = o.owner_id
ORDER BY o.created_at;

-- 3. Ver todos los miembros de organizaciones
SELECT 
  o.name as organization,
  u.email as member_email,
  om.user_id,
  om.role,
  om.joined_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
LEFT JOIN auth.users u ON u.id = om.user_id
ORDER BY o.name, om.role DESC;

-- 4. Ver proyectos con organización
SELECT 
  p.custom_id,
  p.name as project_name,
  o.name as organization_name,
  p.organization_id
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
ORDER BY p.created_at DESC
LIMIT 10;

-- 5. Probar la función RPC que usa el frontend
-- Reemplaza 'USER_ID_AQUI' con tu user_id real (del paso 1)
-- SELECT * FROM get_user_organizations('USER_ID_AQUI');

-- 6. Ver políticas RLS de organization_members
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'organization_members'
ORDER BY policyname;

-- 7. Ver políticas RLS de organizations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY policyname;

-- ========================================
-- RESUMEN ESPERADO:
-- ========================================
-- - 2 usuarios
-- - 1 organización ("Mi Empresa")
-- - 2 miembros (1 owner + 1 admin)
-- - 20 proyectos con organization_id
-- - Las políticas RLS deben existir
-- ========================================

