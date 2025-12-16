-- ========================================
-- SCRIPT: Agregar usuario a una organización
-- ========================================
-- Ejecutar en: SQL Editor de Supabase
-- Propósito: Agregar un usuario como miembro de tu organización
-- ========================================

-- PASO 1: Ver tu organización actual
-- ========================================
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.owner_id,
  (SELECT email FROM auth.users WHERE id = o.owner_id) as owner_email
FROM organizations o
WHERE o.owner_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654';

-- PASO 2: Buscar el user_id del usuario que quieres agregar
-- ========================================
-- Reemplaza el email con el del usuario que quieres agregar
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'arayaignacio88@gmail.com'; -- CAMBIAR POR EL EMAIL DEL USUARIO

-- PASO 3: Agregar el usuario a tu organización
-- ========================================
-- IMPORTANTE: Reemplaza 'USER_ID_DEL_USUARIO' con el user_id del PASO 2
-- Reemplaza 'ORGANIZATION_ID' con el organization_id del PASO 1

DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Obtener el ID de tu organización
  SELECT id INTO v_org_id
  FROM organizations
  WHERE owner_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
  LIMIT 1;

  -- Obtener el ID del usuario a agregar
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'arayaignacio88@gmail.com'; -- CAMBIAR POR EL EMAIL

  -- Verificar que encontramos ambos
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró tu organización';
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el usuario con ese email';
  END IF;

  -- Agregar el usuario como miembro (puedes cambiar 'admin' por 'member' o 'viewer')
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'admin') -- 'owner', 'admin', 'member', o 'viewer'
  ON CONFLICT (organization_id, user_id) 
  DO UPDATE SET role = EXCLUDED.role; -- Si ya existe, actualiza el rol

  RAISE NOTICE 'Usuario agregado exitosamente a la organización';
END $$;

-- PASO 4: Verificar que se agregó correctamente
-- ========================================
SELECT 
  o.name as organization_name,
  (SELECT email FROM auth.users WHERE id = om.user_id) as member_email,
  om.role,
  om.joined_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE o.owner_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654'
ORDER BY om.role DESC, om.joined_at DESC;

-- ========================================
-- FIN DEL SCRIPT
-- ========================================

