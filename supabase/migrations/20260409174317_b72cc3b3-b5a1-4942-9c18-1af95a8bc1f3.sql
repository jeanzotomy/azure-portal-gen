CREATE POLICY "Users can create own projects"
ON public.projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);