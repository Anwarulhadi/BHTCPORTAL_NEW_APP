-- Drop the existing public SELECT policy on teachers
DROP POLICY IF EXISTS "Anyone can read teachers" ON public.teachers;

-- Create new policy that restricts teacher data to authenticated users (admins or students)
CREATE POLICY "Authenticated users can read teachers" 
ON public.teachers 
FOR SELECT 
USING (auth.uid() IS NOT NULL);