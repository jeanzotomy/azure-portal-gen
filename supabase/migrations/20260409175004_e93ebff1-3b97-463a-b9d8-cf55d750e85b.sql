CREATE POLICY "Users can update own projects"
ON public.projects
FOR UPDATE
USING (auth.uid() = user_id);