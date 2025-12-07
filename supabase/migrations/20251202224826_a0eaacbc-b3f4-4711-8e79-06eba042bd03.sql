-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can insert news" ON public.news;
DROP POLICY IF EXISTS "Admins can update news" ON public.news;
DROP POLICY IF EXISTS "Admins can delete news" ON public.news;

DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
DROP POLICY IF EXISTS "Admins can update students" ON public.students;
DROP POLICY IF EXISTS "Admins can delete students" ON public.students;

DROP POLICY IF EXISTS "Admins can insert grades" ON public.grades;
DROP POLICY IF EXISTS "Admins can update grades" ON public.grades;
DROP POLICY IF EXISTS "Admins can delete grades" ON public.grades;

DROP POLICY IF EXISTS "Admins can insert school_settings" ON public.school_settings;
DROP POLICY IF EXISTS "Admins can update school_settings" ON public.school_settings;

DROP POLICY IF EXISTS "Admins can insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can update teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can delete teachers" ON public.teachers;

DROP POLICY IF EXISTS "Admins can manage student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Admins can update comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can delete comments" ON public.comments;

-- Create permissive policies for authenticated users (admin access controlled by frontend password)

-- News policies
CREATE POLICY "Authenticated users can insert news" ON public.news FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update news" ON public.news FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete news" ON public.news FOR DELETE TO authenticated USING (true);

-- Students policies
CREATE POLICY "Authenticated users can insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update students" ON public.students FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete students" ON public.students FOR DELETE TO authenticated USING (true);

-- Grades policies
CREATE POLICY "Authenticated users can insert grades" ON public.grades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update grades" ON public.grades FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete grades" ON public.grades FOR DELETE TO authenticated USING (true);

-- School settings policies
CREATE POLICY "Authenticated users can insert school_settings" ON public.school_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update school_settings" ON public.school_settings FOR UPDATE TO authenticated USING (true);

-- Teachers policies
CREATE POLICY "Authenticated users can insert teachers" ON public.teachers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update teachers" ON public.teachers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete teachers" ON public.teachers FOR DELETE TO authenticated USING (true);

-- Student profiles - authenticated users can manage
CREATE POLICY "Authenticated users can manage student profiles" ON public.student_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Comments - authenticated users can update/delete
CREATE POLICY "Authenticated users can update comments" ON public.comments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete comments" ON public.comments FOR DELETE TO authenticated USING (true);

-- Update SELECT policies to allow authenticated users to read all data
DROP POLICY IF EXISTS "Users can read own grades" ON public.grades;
CREATE POLICY "Users can read grades" ON public.grades FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can read own student record" ON public.students;
CREATE POLICY "Users can read students" ON public.students FOR SELECT TO public USING (true);