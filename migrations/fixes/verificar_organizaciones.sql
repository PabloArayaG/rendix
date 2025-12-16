-- ========================================
-- SCRIPT: Verificar estado actual de organizaciones
-- ========================================
-- Ejecutar en: SQL Editor de Supabase
-- Propósito: Ver todas las organizaciones y sus miembros
-- ========================================

-- PARTE 1: Ver TODAS las organizaciones
-- ========================================
SELECT 
  o.id,
  o.name,
  o.slug,
  o.owner_id,
  (SELECT email FROM auth.users WHERE id = o.owner_id) as owner_email,
  (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as members_count,
  o.created_at
FROM organizations o
ORDER BY o.created_at DESC;

-- PARTE 2: Ver TODOS los miembros de TODAS las organizaciones
-- ========================================
SELECT 
  o.name as organization_name,
  o.id as organization_id,
  (SELECT email FROM auth.users WHERE id = om.user_id) as member_email,
  om.user_id,
  om.role,
  om.joined_at,
  CASE 
    WHEN o.owner_id = om.user_id THEN 'OWNER'
    ELSE 'MEMBER'
  END as member_type
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
ORDER BY o.name, om.role DESC, om.joined_at DESC;

-- PARTE 3: Verificar específicamente el usuario arayaignacio88@gmail.com
-- ========================================
SELECT 
  u.id as user_id,
  u.email,
  o.name as organization_name,
  om.role,
  om.joined_at
FROM auth.users u
JOIN organization_members om ON om.user_id = u.id
JOIN organizations o ON o.id = om.organization_id
WHERE u.email = 'arayaignacio88@gmail.com';

-- PARTE 4: Verificar tu usuario (hellopablo.a@gmail.com)
-- ========================================
SELECT 
  u.id as user_id,
  u.email,
  o.name as organization_name,
  om.role,
  om.joined_at,
  CASE 
    WHEN o.owner_id = u.id THEN 'ES OWNER'
    ELSE 'ES MIEMBRO'
  END as tipo
FROM auth.users u
JOIN organization_members om ON om.user_id = u.id
JOIN organizations o ON o.id = om.organization_id
WHERE u.email = 'hellopablo.a@gmail.com';

-- PARTE 5: Ver proyectos por organización
-- ========================================
SELECT 
  o.name as organization_name,
  COUNT(p.id) as total_projects,
  COUNT(CASE WHEN p.organization_id IS NULL THEN 1 END) as projects_sin_org
FROM organizations o
LEFT JOIN projects p ON p.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;

-- PARTE 6: Resumen completo
-- ========================================
SELECT 
  'Total Organizaciones' as metric,
  COUNT(*)::TEXT as value
FROM organizations
UNION ALL
SELECT 
  'Total Miembros',
  COUNT(*)::TEXT
FROM organization_members
UNION ALL
SELECT 
  'Organizaciones con "Rendix Team"',
  COUNT(*)::TEXT
FROM organizations
WHERE name ILIKE '%rendix%team%'
UNION ALL
SELECT 
  'Organizaciones con "Mi Organización"',
  COUNT(*)::TEXT
FROM organizations
WHERE name ILIKE '%mi%organización%'
UNION ALL
SELECT 
  'Miembros de arayaignacio88@gmail.com',
  COUNT(*)::TEXT
FROM organization_members om
JOIN auth.users u ON u.id = om.user_id
WHERE u.email = 'arayaignacio88@gmail.com'
UNION ALL
SELECT 
  'Miembros de hellopablo.a@gmail.com',
  COUNT(*)::TEXT
FROM organization_members om
JOIN auth.users u ON u.id = om.user_id
WHERE u.email = 'hellopablo.a@gmail.com';

-- ========================================
-- FIN DEL SCRIPT
-- ========================================

