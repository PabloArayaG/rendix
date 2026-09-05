-- Verificación posterior a fixes/harden_multitenancy.sql.
-- Solo lectura. Ejecutar en el proyecto de Supabase STAGING.

BEGIN TRANSACTION READ ONLY;

WITH expected_policies(table_name, policy_name) AS (
  VALUES
    ('organizations', 'organizations_select'),
    ('organizations', 'organizations_insert'),
    ('organizations', 'organizations_update'),
    ('organizations', 'organizations_delete'),
    ('organization_members', 'organization_members_select'),
    ('organization_members', 'organization_members_insert'),
    ('organization_members', 'organization_members_update'),
    ('organization_members', 'organization_members_delete'),
    ('projects', 'projects_select'),
    ('projects', 'projects_insert'),
    ('projects', 'projects_update'),
    ('projects', 'projects_delete'),
    ('expenses', 'expenses_select'),
    ('expenses', 'expenses_insert'),
    ('expenses', 'expenses_update'),
    ('expenses', 'expenses_delete')
), checks AS (
  SELECT
    '16 políticas RLS exactas'::TEXT AS check_name,
    count(*) = 16
      AND count(*) FILTER (WHERE ep.policy_name IS NOT NULL) = 16 AS passed,
    count(*)::TEXT || ' políticas encontradas' AS details
  FROM pg_policies pp
  LEFT JOIN expected_policies ep
    ON ep.table_name = pp.tablename AND ep.policy_name = pp.policyname
  WHERE pp.schemaname = 'public'
    AND pp.tablename IN ('organizations', 'organization_members', 'projects', 'expenses')

  UNION ALL

  SELECT
    'organization_id obligatorio',
    count(*) = 2 AND bool_and(is_nullable = 'NO'),
    string_agg(table_name || '=' || is_nullable, ', ' ORDER BY table_name)
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('projects', 'expenses')
    AND column_name = 'organization_id'

  UNION ALL

  SELECT
    'FK compuesta gasto/proyecto',
    count(*) = 1,
    COALESCE(string_agg(pg_get_constraintdef(oid), ', '), 'no encontrada')
  FROM pg_constraint
  WHERE conrelid = 'public.expenses'::regclass
    AND conname = 'expenses_project_organization_fkey'

  UNION ALL

  SELECT
    'triggers de protección activos',
    count(*) = 3 AND bool_and(tgenabled <> 'D'),
    string_agg(tgname, ', ' ORDER BY tgname)
  FROM pg_trigger
  WHERE NOT tgisinternal
    AND tgname IN (
      'protect_organization_owner_membership_trigger',
      'prevent_organization_owner_change_trigger',
      'trigger_add_owner_as_member'
    )

  UNION ALL

  SELECT
    'RPC de email con organización',
    to_regprocedure('public.get_user_id_by_email(text,uuid)') IS NOT NULL
      AND to_regprocedure('public.get_user_id_by_email(text)') IS NULL,
    'nueva=' || COALESCE(to_regprocedure('public.get_user_id_by_email(text,uuid)')::TEXT, 'no')
      || ', antigua=' || COALESCE(to_regprocedure('public.get_user_id_by_email(text)')::TEXT, 'no')

  UNION ALL

  SELECT
    'helpers protegidos',
    count(*) = 7
      AND bool_and(prosecdef)
      AND bool_and(NOT has_function_privilege('anon', p.oid, 'EXECUTE'))
      AND bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE')),
    count(*)::TEXT || ' funciones verificadas'
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
)
SELECT check_name, passed, details
FROM checks
ORDER BY check_name;

COMMIT;
