-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles: users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS policy: only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop old insecure policies on grades table
DROP POLICY IF EXISTS "Allow public delete to grades" ON public.grades;
DROP POLICY IF EXISTS "Allow public insert to grades" ON public.grades;
DROP POLICY IF EXISTS "Allow public read access to grades" ON public.grades;
DROP POLICY IF EXISTS "Allow public update to grades" ON public.grades;

-- New secure RLS policies for grades
-- Public can read grades (students need to view grades)
CREATE POLICY "Anyone can read grades"
ON public.grades
FOR SELECT
USING (true);

-- Only admins can insert grades
CREATE POLICY "Admins can insert grades"
ON public.grades
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update grades
CREATE POLICY "Admins can update grades"
ON public.grades
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete grades
CREATE POLICY "Admins can delete grades"
ON public.grades
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop old insecure policies on students table
DROP POLICY IF EXISTS "Allow public delete to students" ON public.students;
DROP POLICY IF EXISTS "Allow public insert to students" ON public.students;
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public update to students" ON public.students;

-- New secure RLS policies for students
CREATE POLICY "Anyone can read students"
ON public.students
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update students"
ON public.students
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete students"
ON public.students
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop old insecure policies on teachers table
DROP POLICY IF EXISTS "Allow public delete to teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow public insert to teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow public read access to teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow public update to teachers" ON public.teachers;

-- New secure RLS policies for teachers
CREATE POLICY "Anyone can read teachers"
ON public.teachers
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert teachers"
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update teachers"
ON public.teachers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete teachers"
ON public.teachers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop old insecure policies on news table
DROP POLICY IF EXISTS "Allow public delete to news" ON public.news;
DROP POLICY IF EXISTS "Allow public insert to news" ON public.news;
DROP POLICY IF EXISTS "Allow public read access to news" ON public.news;
DROP POLICY IF EXISTS "Allow public update to news" ON public.news;

-- New secure RLS policies for news
CREATE POLICY "Anyone can read news"
ON public.news
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert news"
ON public.news
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update news"
ON public.news
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete news"
ON public.news
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop old insecure policies on school_settings table
DROP POLICY IF EXISTS "Allow public insert to school_settings" ON public.school_settings;
DROP POLICY IF EXISTS "Allow public read access to school_settings" ON public.school_settings;
DROP POLICY IF EXISTS "Allow public update to school_settings" ON public.school_settings;

-- New secure RLS policies for school_settings
CREATE POLICY "Anyone can read school_settings"
ON public.school_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert school_settings"
ON public.school_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update school_settings"
ON public.school_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop old insecure policies on comments table
DROP POLICY IF EXISTS "Allow public insert to comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public read access to comments" ON public.comments;

-- New secure RLS policies for comments
CREATE POLICY "Anyone can read comments"
ON public.comments
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert comments"
ON public.comments
FOR INSERT
WITH CHECK (true);

-- Drop old insecure policies on admin_password table
DROP POLICY IF EXISTS "Allow public read access to admin_password" ON public.admin_password;
DROP POLICY IF EXISTS "Allow public update to admin_password" ON public.admin_password;

-- Make admin_password table inaccessible (will be deprecated)
-- Only admins can read/update (but we won't use this table anymore)
CREATE POLICY "Admins can read admin_password"
ON public.admin_password
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin_password"
ON public.admin_password
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));