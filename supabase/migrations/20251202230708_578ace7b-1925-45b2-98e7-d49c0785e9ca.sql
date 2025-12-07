
-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for public bucket
CREATE POLICY "Anyone can view student photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

CREATE POLICY "Anyone can upload student photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "Anyone can update student photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'student-photos');

CREATE POLICY "Anyone can delete student photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'student-photos');

-- Drop existing restrictive RLS policies and recreate as permissive
DROP POLICY IF EXISTS "Anyone can read news" ON public.news;
DROP POLICY IF EXISTS "Authenticated users can insert news" ON public.news;
DROP POLICY IF EXISTS "Authenticated users can update news" ON public.news;
DROP POLICY IF EXISTS "Authenticated users can delete news" ON public.news;

CREATE POLICY "Anyone can read news" ON public.news FOR SELECT USING (true);
CREATE POLICY "Anyone can insert news" ON public.news FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update news" ON public.news FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete news" ON public.news FOR DELETE USING (true);

DROP POLICY IF EXISTS "Users can read students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can insert students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON public.students;

CREATE POLICY "Anyone can read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Anyone can insert students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update students" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete students" ON public.students FOR DELETE USING (true);

DROP POLICY IF EXISTS "Users can read grades" ON public.grades;
DROP POLICY IF EXISTS "Authenticated users can insert grades" ON public.grades;
DROP POLICY IF EXISTS "Authenticated users can update grades" ON public.grades;
DROP POLICY IF EXISTS "Authenticated users can delete grades" ON public.grades;

CREATE POLICY "Anyone can read grades" ON public.grades FOR SELECT USING (true);
CREATE POLICY "Anyone can insert grades" ON public.grades FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update grades" ON public.grades FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete grades" ON public.grades FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can read school_settings" ON public.school_settings;
DROP POLICY IF EXISTS "Authenticated users can insert school_settings" ON public.school_settings;
DROP POLICY IF EXISTS "Authenticated users can update school_settings" ON public.school_settings;

CREATE POLICY "Anyone can read school_settings" ON public.school_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert school_settings" ON public.school_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update school_settings" ON public.school_settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete school_settings" ON public.school_settings FOR DELETE USING (true);

DROP POLICY IF EXISTS "Authenticated users can read teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can update teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can delete teachers" ON public.teachers;

CREATE POLICY "Anyone can read teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert teachers" ON public.teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update teachers" ON public.teachers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete teachers" ON public.teachers FOR DELETE USING (true);

DROP POLICY IF EXISTS "Users can read own comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can update comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can delete comments" ON public.comments;

CREATE POLICY "Anyone can read comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update comments" ON public.comments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete comments" ON public.comments FOR DELETE USING (true);

-- Create admin_settings table for storing admin password
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_password text NOT NULL DEFAULT 'admin123',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin_settings" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert admin_settings" ON public.admin_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update admin_settings" ON public.admin_settings FOR UPDATE USING (true);

-- Insert default admin password
INSERT INTO public.admin_settings (admin_password) VALUES ('admin123')
ON CONFLICT DO NOTHING;

-- Enable realtime for comments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
