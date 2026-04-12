
-- Add gestionnaire_id column to projects
ALTER TABLE public.projects
ADD COLUMN gestionnaire_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_projects_gestionnaire_id ON public.projects (gestionnaire_id);
