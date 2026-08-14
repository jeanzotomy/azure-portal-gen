REVOKE EXECUTE ON FUNCTION public.is_marketing_member(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_marketing_manager(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_marketing_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_marketing_manager(uuid) TO authenticated, service_role;