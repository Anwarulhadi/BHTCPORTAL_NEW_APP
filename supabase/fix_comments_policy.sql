-- Enable update and delete for comments table
CREATE POLICY "Allow public update to comments" ON public.comments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to comments" ON public.comments FOR DELETE USING (true);
