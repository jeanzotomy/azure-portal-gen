
CREATE TABLE public.candidate_gamification (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  streak_days INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.candidate_gamification TO authenticated;
GRANT ALL ON public.candidate_gamification TO service_role;

ALTER TABLE public.candidate_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own gamification"
  ON public.candidate_gamification FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'hr')
         OR public.has_role(auth.uid(), 'gestionnaire'));

CREATE POLICY "Users upsert own gamification"
  ON public.candidate_gamification FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own gamification"
  ON public.candidate_gamification FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_gamif_updated
  BEFORE UPDATE ON public.candidate_gamification
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.candidate_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL,
  badge_label TEXT NOT NULL,
  badge_icon TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_code)
);

GRANT SELECT, INSERT ON public.candidate_badges TO authenticated;
GRANT ALL ON public.candidate_badges TO service_role;

ALTER TABLE public.candidate_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own badges"
  ON public.candidate_badges FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'hr')
         OR public.has_role(auth.uid(), 'gestionnaire'));

CREATE POLICY "Users insert own badges"
  ON public.candidate_badges FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_candidate_badges_user ON public.candidate_badges(user_id);

CREATE OR REPLACE FUNCTION public.award_badge(_user_id UUID, _code TEXT, _label TEXT, _icon TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.candidate_badges (user_id, badge_code, badge_label, badge_icon)
  VALUES (_user_id, _code, _label, _icon)
  ON CONFLICT (user_id, badge_code) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_training_completed_gamify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_xp_gain INT := 50;
  v_passed_count INT;
  v_perfect_count INT;
  v_today DATE := CURRENT_DATE;
  v_existing RECORD;
  v_new_streak INT;
  v_new_xp INT;
  v_new_level INT;
  v_training_cat TEXT;
BEGIN
  IF NEW.quiz_passed IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.quiz_passed IS TRUE THEN RETURN NEW; END IF;

  SELECT user_id INTO v_user_id FROM public.onboarding_processes WHERE id = NEW.process_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.quiz_score = 100 THEN v_xp_gain := v_xp_gain + 30; END IF;

  SELECT * INTO v_existing FROM public.candidate_gamification WHERE user_id = v_user_id;

  IF v_existing.user_id IS NULL THEN
    v_new_streak := 1;
    v_new_xp := v_xp_gain;
    v_new_level := GREATEST(1, (v_new_xp / 200) + 1);
    INSERT INTO public.candidate_gamification (user_id, xp, level, streak_days, longest_streak, last_activity_date)
    VALUES (v_user_id, v_new_xp, v_new_level, v_new_streak, v_new_streak, v_today);
  ELSE
    IF v_existing.last_activity_date = v_today THEN
      v_new_streak := v_existing.streak_days;
    ELSIF v_existing.last_activity_date = v_today - INTERVAL '1 day' THEN
      v_new_streak := v_existing.streak_days + 1;
    ELSE
      v_new_streak := 1;
    END IF;
    v_new_xp := v_existing.xp + v_xp_gain;
    v_new_level := GREATEST(1, (v_new_xp / 200) + 1);
    UPDATE public.candidate_gamification
    SET xp = v_new_xp, level = v_new_level, streak_days = v_new_streak,
        longest_streak = GREATEST(v_existing.longest_streak, v_new_streak),
        last_activity_date = v_today
    WHERE user_id = v_user_id;
  END IF;

  SELECT COUNT(*) INTO v_passed_count
  FROM public.onboarding_assigned_trainings a
  JOIN public.onboarding_processes p ON p.id = a.process_id
  WHERE p.user_id = v_user_id AND a.quiz_passed IS TRUE;

  SELECT COUNT(*) INTO v_perfect_count
  FROM public.onboarding_assigned_trainings a
  JOIN public.onboarding_processes p ON p.id = a.process_id
  WHERE p.user_id = v_user_id AND a.quiz_score = 100;

  SELECT LOWER(COALESCE(category, '')) INTO v_training_cat
  FROM public.trainings WHERE id = NEW.training_id;

  PERFORM public.award_badge(v_user_id, 'first_steps', 'Premiers pas', '👣');
  PERFORM public.award_badge(v_user_id, 'quiz_passed', 'Quiz Réussi', '✅');

  IF NEW.quiz_score = 100 THEN
    PERFORM public.award_badge(v_user_id, 'perfect_quiz', 'Sans Faute', '💯');
  END IF;
  IF v_passed_count >= 3 THEN
    PERFORM public.award_badge(v_user_id, 'cloud_apprentice', 'Apprenti Cloud', '☁️');
  END IF;
  IF v_passed_count >= 5 THEN
    PERFORM public.award_badge(v_user_id, 'cloud_pioneer', 'Cloud Pioneer', '🚀');
  END IF;
  IF v_perfect_count >= 3 THEN
    PERFORM public.award_badge(v_user_id, 'perfectionist', 'Perfectionniste', '🌟');
  END IF;
  IF v_training_cat LIKE '%security%' OR v_training_cat LIKE '%sécurité%' OR v_training_cat LIKE '%securite%' THEN
    PERFORM public.award_badge(v_user_id, 'security_master', 'Security Master', '🛡️');
  END IF;

  IF v_new_streak >= 3 THEN PERFORM public.award_badge(v_user_id, 'streak_3', 'Régulier (3 jours)', '🔥'); END IF;
  IF v_new_streak >= 7 THEN PERFORM public.award_badge(v_user_id, 'streak_7', 'Assidu (7 jours)', '🔥'); END IF;
  IF v_new_streak >= 30 THEN PERFORM public.award_badge(v_user_id, 'streak_30', 'Marathonien (30 jours)', '🏆'); END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_training_gamify
  AFTER INSERT OR UPDATE OF quiz_passed ON public.onboarding_assigned_trainings
  FOR EACH ROW EXECUTE FUNCTION public.on_training_completed_gamify();
