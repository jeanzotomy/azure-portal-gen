-- Add FKs so PostgREST can embed training and process
ALTER TABLE public.onboarding_assigned_trainings
  ADD CONSTRAINT onboarding_assigned_trainings_training_id_fkey
  FOREIGN KEY (training_id) REFERENCES public.trainings(id) ON DELETE CASCADE;

ALTER TABLE public.onboarding_assigned_trainings
  ADD CONSTRAINT onboarding_assigned_trainings_process_id_fkey
  FOREIGN KEY (process_id) REFERENCES public.onboarding_processes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_oat_process_id ON public.onboarding_assigned_trainings(process_id);
CREATE INDEX IF NOT EXISTS idx_oat_training_id ON public.onboarding_assigned_trainings(training_id);