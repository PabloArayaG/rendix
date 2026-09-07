-- Ejecutar completo en SQL Editor del proyecto STAGING.
-- Solo lectura: devuelve un informe sin emails, tokens ni contenido de gastos.
BEGIN TRANSACTION READ ONLY;

SELECT jsonb_build_object(
  'columns', (
    SELECT jsonb_agg(to_jsonb(c)) FROM (
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('organizations', 'organization_members', 'projects', 'expenses')
      ORDER BY table_name, ordinal_position
    ) c
  ),
  'policies', (
    SELECT jsonb_agg(to_jsonb(p)) FROM (
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE (schemaname = 'public' AND tablename IN ('organizations', 'organization_members', 'projects', 'expenses'))
        OR (schemaname = 'storage' AND tablename = 'objects')
    ) p
  ),
  'functions', (
    SELECT jsonb_agg(jsonb_build_object(
      'name', p.proname,
      'arguments', pg_get_function_arguments(p.oid),
      'result', pg_get_function_result(p.oid),
      'definition', pg_get_functiondef(p.oid)
    ))
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND (p.prosecdef OR p.proname = 'update_project_real_costs')
  ),
  'constraints', (
    SELECT jsonb_agg(jsonb_build_object('table', conrelid::regclass::text,
      'name', conname, 'definition', pg_get_constraintdef(oid)))
    FROM pg_constraint
    WHERE conrelid IN ('public.organizations'::regclass, 'public.organization_members'::regclass,
      'public.projects'::regclass, 'public.expenses'::regclass)
  ),
  'projects_without_org', (SELECT count(*) FROM public.projects WHERE organization_id IS NULL),
  'expenses_without_org', (SELECT count(*) FROM public.expenses WHERE organization_id IS NULL),
  'expenses_org_mismatch', (SELECT count(*) FROM public.expenses e JOIN public.projects p ON p.id = e.project_id
    WHERE e.organization_id IS DISTINCT FROM p.organization_id),
  'expenses_without_project', (SELECT count(*) FROM public.expenses e LEFT JOIN public.projects p ON p.id = e.project_id WHERE p.id IS NULL),
  'invalid_owner_memberships', (SELECT count(*) FROM public.organization_members m JOIN public.organizations o ON o.id = m.organization_id
    WHERE (m.role = 'owner') IS DISTINCT FROM (m.user_id = o.owner_id)),
  'owners_without_membership', (SELECT count(*) FROM public.organizations o WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_members m WHERE m.organization_id = o.id AND m.user_id = o.owner_id AND m.role = 'owner')),
  'receipt_bucket', (SELECT jsonb_build_object('public', public, 'size_limit', file_size_limit) FROM storage.buckets WHERE id = 'receipts')
) AS preflight_report;

COMMIT;
