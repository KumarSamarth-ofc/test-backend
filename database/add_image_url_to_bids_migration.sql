-- Migration to add image_url field to bids table
-- Run this query in your Supabase SQL editor

-- Add image_url column to bids table
ALTER TABLE bids ADD COLUMN image_url TEXT;

-- Add comment to document the field
COMMENT ON COLUMN bids.image_url IS 'URL of the image uploaded for this bid';

-- Optional: Add an index for better query performance if you plan to search by image_url
-- CREATE INDEX idx_bids_image_url ON bids(image_url) WHERE image_url IS NOT NULL;
