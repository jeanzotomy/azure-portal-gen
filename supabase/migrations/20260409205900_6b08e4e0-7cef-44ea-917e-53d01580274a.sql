-- Add deleted_at column to profiles for soft delete
ALTER TABLE public.profiles ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;