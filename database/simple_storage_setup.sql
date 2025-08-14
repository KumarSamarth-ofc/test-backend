-- Simple storage setup (alternative to complex policies)
-- Use this if you want basic functionality without complex access control

-- 1. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Simple policy: Allow all authenticated users to upload/read images
CREATE POLICY "Simple image access" ON storage.objects
FOR ALL USING (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);

-- 3. Allow public read access to images
CREATE POLICY "Public read access to images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'images'
);
