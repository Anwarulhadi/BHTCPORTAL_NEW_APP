-- Add missing grade_display column to grades table
ALTER TABLE public.grades 
ADD COLUMN IF NOT EXISTS grade_display text;

-- Reload schema cache
NOTIFY pgrst, 'reload config';
