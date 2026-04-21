ALTER TABLE public.job_postings
  ADD COLUMN sector TEXT,
  ADD COLUMN start_date TEXT,
  ADD COLUMN salary_range TEXT;