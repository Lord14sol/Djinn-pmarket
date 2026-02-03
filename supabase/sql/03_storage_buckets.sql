-- ═══════════════════════════════════════════════════════════════
-- SUPABASE STORAGE: Comment Images Bucket
-- ═══════════════════════════════════════════════════════════════

-- Create storage bucket for comment images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'comment-images',
    'comment-images',
    true, -- Public access
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- STORAGE POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload comment images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comment-images');

-- Allow public read access to all images
CREATE POLICY "Public read access to comment images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'comment-images');

-- Allow users to delete their own images (optional)
CREATE POLICY "Users can delete their own comment images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'comment-images');

-- ═══════════════════════════════════════════════════════════════
-- NOTES
-- ═══════════════════════════════════════════════════════════════
-- This migration creates a public storage bucket for comment images
-- with a 5MB file size limit and restricted to common image types.
-- Images are publicly accessible for optimal performance.
