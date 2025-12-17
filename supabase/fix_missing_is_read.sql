-- Add is_read column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'is_read') THEN
        ALTER TABLE public.comments ADD COLUMN is_read boolean DEFAULT false;
    END IF;
END $$;

-- Refresh the schema cache by notifying (optional, but good practice)
NOTIFY pgrst, 'reload schema';

-- Re-apply policies just to be absolutely sure
DROP POLICY IF EXISTS "Allow public read access to comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public insert to comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public update to comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public delete to comments" ON public.comments;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow public insert to comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to comments" ON public.comments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to comments" ON public.comments FOR DELETE USING (true);
