-- 1. Create student_profiles table to link auth users to student records
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Students can only view their own profile
CREATE POLICY "Users can view own student profile"
ON public.student_profiles
FOR SELECT
USING (user_id = auth.uid());

-- Admins can manage all profiles
CREATE POLICY "Admins can manage student profiles"
ON public.student_profiles
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2. Add 'student' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';

-- 3. Update grades RLS - restrict to own grades or admin
DROP POLICY IF EXISTS "Anyone can read grades" ON public.grades;
CREATE POLICY "Users can read own grades"
ON public.grades
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  student_id IN (SELECT student_id FROM public.student_profiles WHERE user_id = auth.uid())
);

-- 4. Update students RLS - restrict to own record or admin
DROP POLICY IF EXISTS "Anyone can read students" ON public.students;
CREATE POLICY "Users can read own student record"
ON public.students
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  student_id IN (SELECT student_id FROM public.student_profiles WHERE user_id = auth.uid())
);

-- 5. Update comments RLS - restrict to own comments or admin
DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;
CREATE POLICY "Users can read own comments"
ON public.comments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  student_id IN (SELECT student_id FROM public.student_profiles WHERE user_id = auth.uid())
);

-- 6. Update comment insertion policy for authenticated students
DROP POLICY IF EXISTS "Admins can insert comments as teacher" ON public.comments;
CREATE POLICY "Authenticated users can insert comments"
ON public.comments
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') AND sender_type = 'teacher') OR
  (auth.uid() IS NOT NULL AND sender_type = 'student' AND 
   student_id IN (SELECT student_id FROM public.student_profiles WHERE user_id = auth.uid()))
);