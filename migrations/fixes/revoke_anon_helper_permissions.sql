-- Retira permisos RPC directos del rol anon después del hardening.
-- Ejecutar en Supabase STAGING y verificar después con verify_hardening.sql.

BEGIN;

REVOKE ALL ON FUNCTION public.is_organization_member(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_organization_role(UUID, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_belongs_to_organization(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_organizations(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_id_by_email(TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_emails(UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_organization_members_with_emails(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_organization_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_organization(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organizations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_emails(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_members_with_emails(UUID) TO authenticated;

-- Estas funciones solo se ejecutan mediante triggers.
REVOKE ALL ON FUNCTION public.protect_organization_owner_membership() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_owner_as_member() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_organization_owner_change() FROM PUBLIC, anon, authenticated;

COMMIT;
