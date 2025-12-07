-- Add gender column to track student gender selections
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Male', 'Female'));

COMMENT ON COLUMN public.students.gender IS 'Stores the gender selected from the admin portal form.';
