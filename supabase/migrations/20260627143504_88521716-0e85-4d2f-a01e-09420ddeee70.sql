
-- Public-by-design RPCs (keep anon EXECUTE):
--   public.get_job_by_slug, public.search_kb_articles, public.submit_job_application

-- 1) Revoke anon EXECUTE on every other SECURITY DEFINER RPC currently granted to anon.
REVOKE EXECUTE ON FUNCTION public.award_learner_xp(text, integer, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_learner_leaderboard(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_learner_rank() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_portal_context() FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_training_co_learners(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_training_co_learners(uuid, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_training_comment_official(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_learner_follow(uuid) FROM anon;

-- 2) Trigger-only function — revoke from anon and authenticated; only triggers/service_role need it.
REVOKE EXECUTE ON FUNCTION public.enforce_training_comment_author_name() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_training_comment_author_name() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_training_comment_author_name() FROM PUBLIC;
