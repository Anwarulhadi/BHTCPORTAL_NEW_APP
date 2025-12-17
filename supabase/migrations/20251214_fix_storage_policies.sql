-- Create buckets if they don't exist (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('module_files', 'module_files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('module_covers', 'module_covers', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies for module_files to avoid conflicts
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Create new public policies for module_files
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'module_files');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'module_files');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'module_files');
CREATE POLICY "Public Select" ON storage.objects FOR SELECT USING (bucket_id = 'module_files');

-- Drop existing policies for module_covers to avoid conflicts
DROP POLICY IF EXISTS "Public Upload Covers" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Covers" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Covers" ON storage.objects;
DROP POLICY IF EXISTS "Public Select Covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Covers" ON storage.objects;

-- Create new public policies for module_covers
CREATE POLICY "Public Upload Covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'module_covers');
CREATE POLICY "Public Update Covers" ON storage.objects FOR UPDATE USING (bucket_id = 'module_covers');
CREATE POLICY "Public Delete Covers" ON storage.objects FOR DELETE USING (bucket_id = 'module_covers');
CREATE POLICY "Public Select Covers" ON storage.objects FOR SELECT USING (bucket_id = 'module_covers');
