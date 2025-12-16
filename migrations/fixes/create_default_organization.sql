-- ========================================
-- SCRIPT: Crear organización por defecto para usuario
-- ========================================
-- Ejecutar en: SQL Editor de Supabase
-- Propósito: Verificar y crear organización inicial si no existe
-- ========================================

-- PASO 1: Ver tu user_id actual
-- ========================================
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'hellopablo.a@gmail.com'; -- CAMBIAR POR TU EMAIL

-- PASO 2: Verificar organizaciones existentes
-- ========================================
SELECT 
  o.id,
  o.name,
  o.slug,
  o.owner_id,
  (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as members_count,
  o.created_at
FROM organizations o
ORDER BY o.created_at DESC;

-- PASO 3: Verificar membresías del usuario
-- ========================================
SELECT 
  om.id,
  om.organization_id,
  om.user_id,
  om.role,
  o.name as organization_name,
  om.joined_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654';

-- PASO 4: Crear organización por defecto (si no existe ninguna)
-- ========================================

DO $$
DECLARE
  v_user_id UUID := 'b3cbf1f5-1030-4e0a-882a-265cb230a654';
  v_org_id UUID;
  v_org_count INTEGER;
BEGIN
  -- Verificar si el usuario ya tiene organizaciones
  SELECT COUNT(*) INTO v_org_count
  FROM organization_members
  WHERE user_id = v_user_id;

  -- Si no tiene organizaciones, crear una por defecto
  IF v_org_count = 0 THEN
    -- Crear la organización
    INSERT INTO organizations (name, slug, owner_id)
    VALUES ('Mi Organización', 'mi-organizacion', v_user_id)
    RETURNING id INTO v_org_id;

    -- El trigger add_owner_as_member debería agregarte automáticamente,
    -- pero por seguridad lo verificamos
    IF NOT EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = v_org_id AND user_id = v_user_id
    ) THEN
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (v_org_id, v_user_id, 'owner');
    END IF;

    RAISE NOTICE 'Organización creada exitosamente: %', v_org_id;
  ELSE
    RAISE NOTICE 'El usuario ya tiene % organización(es)', v_org_count;
  END IF;
END $$;

-- PASO 5: Migrar proyectos existentes a la organización
-- ========================================
-- SOLO SI TIENES PROYECTOS SIN organization_id

-- Primero, verificar proyectos sin organización
SELECT 
  id,
  custom_id,
  name,
  user_id,
  organization_id,
  created_at
FROM projects
WHERE organization_id IS NULL
ORDER BY created_at DESC;

-- Luego, asignarlos a tu organización
UPDATE projects
SET organization_id = (
  SELECT om.organization_id 
  FROM organization_members om
  WHERE om.user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
  LIMIT 1
)
WHERE user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
  AND organization_id IS NULL;

-- PASO 6: Migrar gastos existentes a la organización
-- ========================================
-- SOLO SI TIENES GASTOS SIN organization_id

-- Primero, verificar gastos sin organización
SELECT 
  id,
  description,
  project_id,
  user_id,
  organization_id,
  created_at
FROM expenses
WHERE organization_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Luego, asignarlos a tu organización
UPDATE expenses
SET organization_id = (
  SELECT om.organization_id 
  FROM organization_members om
  WHERE om.user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
  LIMIT 1
)
WHERE user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
  AND organization_id IS NULL;

-- PASO 7: Verificación final
-- ========================================

-- Ver resumen completo
SELECT 
  'Organizaciones' as tipo,
  COUNT(*) as cantidad
FROM organizations
UNION ALL
SELECT 
  'Miembros' as tipo,
  COUNT(*) as cantidad
FROM organization_members
UNION ALL
SELECT 
  'Proyectos con org' as tipo,
  COUNT(*) as cantidad
FROM projects
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Proyectos sin org' as tipo,
  COUNT(*) as cantidad
FROM projects
WHERE organization_id IS NULL
UNION ALL
SELECT 
  'Gastos con org' as tipo,
  COUNT(*) as cantidad
FROM expenses
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Gastos sin org' as tipo,
  COUNT(*) as cantidad
FROM expenses
WHERE organization_id IS NULL;

-- ========================================
-- FIN DEL SCRIPT
-- ========================================

