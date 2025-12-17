-- Force schema cache reload
NOTIFY pgrst, 'reload config';

-- Ensure columns exist in school_settings
ALTER TABLE public.school_settings 
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS show_grade_letters boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_admin_avg_grades boolean DEFAULT true;

-- Ensure columns exist in students
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS contact_info text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS show_final_grade_letter boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS course text;

-- Ensure columns exist in teachers
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS telegram text;

-- Verify the columns are there (this will show in the output)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'school_settings';
