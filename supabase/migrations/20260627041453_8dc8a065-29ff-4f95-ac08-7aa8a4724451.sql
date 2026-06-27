
CREATE OR REPLACE FUNCTION public.admin_security_audit()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_tables_total int;
  v_tables_without_rls int;
  v_tables_without_policy int;
  v_permissive_write_policies int;
  v_findings int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT count(*) INTO v_tables_total
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r';

  SELECT count(*) INTO v_tables_without_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

  SELECT count(*) INTO v_tables_without_policy
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = c.relname
    );

  SELECT count(*) INTO v_permissive_write_policies
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.cmd <> 'SELECT'
    AND (
      (p.cmd <> 'INSERT' AND coalesce(btrim(p.qual::text), '') IN ('', 'true'))
      OR (p.cmd <> 'DELETE' AND coalesce(btrim(p.with_check::text), '') IN ('', 'true'))
    )
    AND EXISTS (
      SELECT 1 FROM unnest(p.roles) r
      WHERE r IN ('anon', 'authenticated', 'public')
    );

  v_findings := v_tables_without_rls + v_tables_without_policy + v_permissive_write_policies;

  RETURN jsonb_build_object(
    'findings', v_findings,
    'scanned_at', now(),
    'details', jsonb_build_object(
      'tables_total', v_tables_total,
      'tables_without_rls', v_tables_without_rls,
      'tables_without_policy', v_tables_without_policy,
      'permissive_write_policies', v_permissive_write_policies
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_security_audit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_security_audit() TO authenticated;
