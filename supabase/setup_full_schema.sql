-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- Create tables
CREATE TABLE IF NOT EXISTS public.admin_password (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    password text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
    student_id text PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    photo_url text,
    locked boolean DEFAULT false,
    gender text,
    show_final_grade_letter boolean DEFAULT true,
    course text,
    contact_info text,
    password text
);

CREATE TABLE IF NOT EXISTS public.teachers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    phone text NOT NULL,
    subject text NOT NULL,
    photo_url text,
    created_at timestamp with time zone DEFAULT now(),
    telegram text
);

CREATE TABLE IF NOT EXISTS public.school_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    school_phone text NOT NULL,
    school_admin_text text DEFAULT 'Contact School Admin & Registration'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    photo_url text,
    show_grade_letters boolean DEFAULT true,
    show_admin_avg_grades boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.news (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id text NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    subject text NOT NULL,
    grade integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by text,
    total text,
    CONSTRAINT grades_grade_check CHECK (((grade >= 0) AND (grade <= 100))),
    CONSTRAINT grades_student_id_subject_key UNIQUE (student_id, subject)
);

CREATE TABLE IF NOT EXISTS public.comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id text NOT NULL,
    message text NOT NULL,
    sender_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_read boolean DEFAULT false,
    CONSTRAINT comments_sender_type_check CHECK ((sender_type = ANY (ARRAY['student'::text, 'teacher'::text])))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_comments_student_id ON public.comments USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_students_course ON public.students ((lower(course)));

-- Enable Row Level Security
ALTER TABLE public.admin_password ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Create Policies (Permissive for this app's architecture)
CREATE POLICY "Allow public read access to admin_password" ON public.admin_password FOR SELECT USING (true);
CREATE POLICY "Allow public update to admin_password" ON public.admin_password FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow public insert to comments" ON public.comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to grades" ON public.grades FOR SELECT USING (true);
CREATE POLICY "Allow public insert to grades" ON public.grades FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to grades" ON public.grades FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to grades" ON public.grades FOR DELETE USING (true);

CREATE POLICY "Allow public read access to news" ON public.news FOR SELECT USING (true);
CREATE POLICY "Allow public insert to news" ON public.news FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to news" ON public.news FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to news" ON public.news FOR DELETE USING (true);

CREATE POLICY "Allow public read access to school_settings" ON public.school_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert to school_settings" ON public.school_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to school_settings" ON public.school_settings FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow public insert to students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to students" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to students" ON public.students FOR DELETE USING (true);

CREATE POLICY "Allow public read access to teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Allow public insert to teachers" ON public.teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to teachers" ON public.teachers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to teachers" ON public.teachers FOR DELETE USING (true);

-- Insert default data
INSERT INTO public.admin_password (password) VALUES ('admin123') ON CONFLICT DO NOTHING;
INSERT INTO public.school_settings (school_phone, school_admin_text) VALUES ('+251-911-000-000', 'Contact School Admin') ON CONFLICT DO NOTHING;

-- Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'student-photos' );
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'student-photos' );
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'student-photos' );
