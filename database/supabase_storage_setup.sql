-- Supabase Storage Setup (Corrected)
-- Note: Storage policies should be set via Supabase Dashboard or API
-- This file contains the database migration only

-- 1. Add image_url to bids table (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bids' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE bids ADD COLUMN image_url TEXT;
        COMMENT ON COLUMN bids.image_url IS 'URL of the image uploaded for this bid';
    END IF;
END $$;

-- 2. Verify campaigns table has image_url field
SELECT 
    'campaigns' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name = 'image_url';

-- 3. Create a function to help with image URL validation
CREATE OR REPLACE FUNCTION validate_image_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic URL validation for Supabase storage URLs
    RETURN url IS NULL OR url ~ '^https://.*\.supabase\.co/storage/v1/object/public/images/';
END;
$$ LANGUAGE plpgsql;

-- 4. Add check constraint to ensure valid image URLs (optional)
-- ALTER TABLE bids ADD CONSTRAINT check_valid_image_url 
--     CHECK (validate_image_url(image_url));
-- 
-- ALTER TABLE campaigns ADD CONSTRAINT check_valid_image_url 
--     CHECK (validate_image_url(image_url));
