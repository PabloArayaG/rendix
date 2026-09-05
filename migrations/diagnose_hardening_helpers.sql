-- Diagnóstico de permisos de helpers posteriores al hardening.
-- Solo lectura. Ejecutar en Supabase STAGING.

BEGIN TRANSACTION READ ONLY;

SELECT
  p.oid::regprocedure::TEXT AS function_name,
  p.prosecdef AS security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  COALESCE(array_to_string(p.proconfig, ', '), '') AS function_config,
  COALESCE(array_to_string(p.proacl, ', '), 'privilegios por defecto') AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_organization_member',
    'has_organization_role',
    'user_belongs_to_organization',
    'get_user_organizations',
    'get_user_id_by_email',
    'get_user_emails',
    'get_organization_members_with_emails'
  )
ORDER BY function_name;

COMMIT;
