-- ========================================
-- FUNCIONES RPC: Para gestionar miembros de organizaciones
-- ========================================
-- Ejecutar en: SQL Editor de Supabase
-- Propósito: Crear funciones helper para obtener emails de usuarios
-- ========================================

-- Función para obtener el user_id por email
-- ========================================
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS TABLE (user_id UUID, email TEXT) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::TEXT as email
  FROM auth.users u
  WHERE u.email = user_email
  LIMIT 1;
END;
$$;

-- Función para obtener emails de múltiples usuarios
-- ========================================
CREATE OR REPLACE FUNCTION get_user_emails(user_ids UUID[])
RETURNS TABLE (user_id UUID, email TEXT) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::TEXT as email
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Función para obtener información completa de miembros con emails
-- ========================================
CREATE OR REPLACE FUNCTION get_organization_members_with_emails(org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  user_email TEXT
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    om.id,
    om.organization_id,
    om.user_id,
    om.role::TEXT,
    om.joined_at,
    u.email::TEXT as user_email
  FROM organization_members om
  JOIN auth.users u ON u.id = om.user_id
  WHERE om.organization_id = org_id
  ORDER BY om.joined_at DESC;
END;
$$;

-- Verificar que las funciones se crearon correctamente
-- ========================================
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_id_by_email', 'get_user_emails', 'get_organization_members_with_emails')
ORDER BY routine_name;

-- ========================================
-- FIN DEL SCRIPT
-- ========================================

