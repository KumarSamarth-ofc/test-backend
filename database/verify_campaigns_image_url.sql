-- Verify that campaigns table has image_url field
-- Run this query to check if the field exists

-- Check if image_url column exists in campaigns table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name = 'image_url';

-- If the above query returns no results, run this to add the field:
-- ALTER TABLE campaigns ADD COLUMN image_url TEXT;
-- COMMENT ON COLUMN campaigns.image_url IS 'URL of the image uploaded for this campaign';
