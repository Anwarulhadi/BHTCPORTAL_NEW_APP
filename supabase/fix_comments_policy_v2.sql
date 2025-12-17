-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public insert to comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public update to comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public delete to comments" ON public.comments;

-- Enable RLS (just in case)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Re-create policies
CREATE POLICY "Allow public read access to comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow public insert to comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to comments" ON public.comments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to comments" ON public.comments FOR DELETE USING (true);
