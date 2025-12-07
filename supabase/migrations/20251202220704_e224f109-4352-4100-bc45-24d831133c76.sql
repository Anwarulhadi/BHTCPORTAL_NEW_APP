-- 1. Drop the legacy admin_password table (no longer needed with Supabase Auth)
DROP TABLE IF EXISTS public.admin_password;

-- 2. Fix comments RLS - drop permissive policies and add more restrictive ones
DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;

-- Comments can be read by admins or filtered by student_id in application
-- For now, keep public read but restrict inserts
CREATE POLICY "Anyone can read comments"
ON public.comments
FOR SELECT
USING (true);

-- Restrict comment insertion: require authentication OR limit to student sender_type only
-- Since students aren't authenticated, we'll validate sender_type must be 'student' for unauthenticated users
-- Admins (authenticated) can insert with any sender_type
CREATE POLICY "Admins can insert comments as teacher"
ON public.comments
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') AND sender_type = 'teacher') OR
  (sender_type = 'student')
);

-- Allow admins to update and delete comments
CREATE POLICY "Admins can update comments"
ON public.comments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete comments"
ON public.comments
FOR DELETE
USING (has_role(auth.uid(), 'admin'));