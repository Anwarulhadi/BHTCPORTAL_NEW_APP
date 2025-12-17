-- 1. Add the column if it doesn't exist
ALTER TABLE public.school_settings 
ADD COLUMN IF NOT EXISTS is_portal_enabled BOOLEAN DEFAULT TRUE;

-- 2. Ensure RLS policies allow update (just to be safe)
DROP POLICY IF EXISTS "Allow public update to school_settings" ON public.school_settings;
CREATE POLICY "Allow public update to school_settings" ON public.school_settings FOR UPDATE USING (true);

-- 3. Insert a default row if the table is empty
INSERT INTO public.school_settings (school_phone, school_admin_text, is_portal_enabled)
SELECT '+251-911-000-000', 'Contact School Admin', true
WHERE NOT EXISTS (SELECT 1 FROM public.school_settings);
