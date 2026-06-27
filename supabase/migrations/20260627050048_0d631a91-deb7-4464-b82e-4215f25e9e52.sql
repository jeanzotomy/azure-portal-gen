-- ============================================================
-- USER NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  level text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  meta jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_all
  ON public.user_notifications(user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own notifications"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "users update own notifications"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own notifications"
  ON public.user_notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- RPC to mark all as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  WITH upd AS (
    UPDATE public.user_notifications
       SET read_at = now()
     WHERE user_id = auth.uid() AND read_at IS NULL
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM upd;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM public;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- ============================================================
-- NOTIFICATION PREFERENCES ON PROFILE
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{
    "tickets": {"email": true, "in_app": true},
    "invoices": {"email": true, "in_app": true},
    "trainings": {"email": true, "in_app": true},
    "weekly_digest": {"email": true}
  }'::jsonb;

-- ============================================================
-- PORTAL ASSISTANT — persistent conversation
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portal_assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portal_assistant_messages_user
  ON public.portal_assistant_messages(user_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.portal_assistant_messages TO authenticated;
GRANT ALL ON public.portal_assistant_messages TO service_role;

ALTER TABLE public.portal_assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own assistant messages"
  ON public.portal_assistant_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "users insert own assistant messages"
  ON public.portal_assistant_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users clear own assistant messages"
  ON public.portal_assistant_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- KB ARTICLES (self-service knowledge base)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  excerpt text,
  tags text[] NOT NULL DEFAULT '{}',
  lang text NOT NULL DEFAULT 'fr',
  published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  search_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(excerpt,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(body,'')), 'C')
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kb_articles_search ON public.kb_articles USING gin(search_tsv);
CREATE INDEX IF NOT EXISTS idx_kb_articles_tags ON public.kb_articles USING gin(tags);

GRANT SELECT ON public.kb_articles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kb_articles TO service_role;

ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone authenticated can read published articles"
  ON public.kb_articles FOR SELECT TO authenticated
  USING (published = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "staff manage kb articles"
  ON public.kb_articles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE TRIGGER trg_kb_articles_updated
BEFORE UPDATE ON public.kb_articles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Search RPC (full-text + tag filter)
CREATE OR REPLACE FUNCTION public.search_kb_articles(_q text, _lang text DEFAULT 'fr', _limit int DEFAULT 20)
RETURNS TABLE(id uuid, slug text, title text, excerpt text, tags text[], rank real)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.slug, a.title, a.excerpt, a.tags,
         CASE WHEN _q IS NULL OR length(trim(_q)) = 0 THEN 1.0
              ELSE ts_rank(a.search_tsv, plainto_tsquery('simple', _q))
         END AS rank
  FROM public.kb_articles a
  WHERE a.published = true
    AND (_lang IS NULL OR a.lang = _lang)
    AND (
      _q IS NULL OR length(trim(_q)) = 0
      OR a.search_tsv @@ plainto_tsquery('simple', _q)
    )
  ORDER BY rank DESC, a.created_at DESC
  LIMIT GREATEST(_limit, 1);
$$;
REVOKE ALL ON FUNCTION public.search_kb_articles(text, text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.search_kb_articles(text, text, int) TO authenticated;

-- ============================================================
-- PORTAL CONTEXT RPC (used by assistant + dashboard)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_portal_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_open_tickets int;
  v_unpaid int;
  v_unpaid_amount numeric;
  v_due_soon int;
  v_active_trainings int;
  v_completed_trainings int;
  v_unread_notifs int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT COUNT(*) INTO v_open_tickets FROM public.support_tickets
    WHERE user_id = v_uid AND status IN ('ouvert','en_cours');

  SELECT COUNT(*), COALESCE(SUM(total),0) INTO v_unpaid, v_unpaid_amount
  FROM public.service_invoices
  WHERE assigned_user_id = v_uid AND status IN ('emise','en_retard');

  SELECT COUNT(*) INTO v_due_soon FROM public.service_invoices
  WHERE assigned_user_id = v_uid AND status = 'emise' AND due_date IS NOT NULL
    AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days';

  SELECT COUNT(*) FILTER (WHERE a.completed_at IS NULL),
         COUNT(*) FILTER (WHERE a.completed_at IS NOT NULL)
  INTO v_active_trainings, v_completed_trainings
  FROM public.onboarding_assigned_trainings a
  JOIN public.onboarding_processes p ON p.id = a.process_id
  WHERE p.user_id = v_uid;

  SELECT COUNT(*) INTO v_unread_notifs FROM public.user_notifications
  WHERE user_id = v_uid AND read_at IS NULL;

  RETURN jsonb_build_object(
    'open_tickets', v_open_tickets,
    'unpaid_invoices', v_unpaid,
    'unpaid_amount', v_unpaid_amount,
    'invoices_due_soon', v_due_soon,
    'active_trainings', v_active_trainings,
    'completed_trainings', v_completed_trainings,
    'unread_notifications', v_unread_notifs
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_portal_context() FROM public;
GRANT EXECUTE ON FUNCTION public.get_portal_context() TO authenticated;