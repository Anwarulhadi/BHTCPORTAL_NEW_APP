-- Allow public update access to comments (needed for marking as read)
CREATE POLICY "Allow public update to comments" ON public.comments FOR UPDATE USING (true);
