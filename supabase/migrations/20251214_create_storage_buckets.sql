-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('module_files', 'module_files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('module_covers', 'module_covers', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for module_files
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'module_files');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'module_files');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'module_files');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'module_files');

-- Policies for module_covers
CREATE POLICY "Public Access Covers" ON storage.objects FOR SELECT USING (bucket_id = 'module_covers');
CREATE POLICY "Public Upload Covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'module_covers');
CREATE POLICY "Public Update Covers" ON storage.objects FOR UPDATE USING (bucket_id = 'module_covers');
CREATE POLICY "Public Delete Covers" ON storage.objects FOR DELETE USING (bucket_id = 'module_covers');
