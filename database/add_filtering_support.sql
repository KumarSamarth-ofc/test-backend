-- Migration: Add filtering support to campaigns, bids, and users tables
-- This migration adds location fields and converts language/category to arrays

-- ============================================
-- 1. UPDATE CAMPAIGNS TABLE
-- ============================================

-- Add locations array field
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS locations TEXT[] DEFAULT '{}';

-- Convert language from TEXT to TEXT[] (if not already array)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'language' 
        AND data_type = 'text'
    ) THEN
        -- Create temporary column
        ALTER TABLE campaigns ADD COLUMN languages_temp TEXT[];
        
        -- Migrate existing data (convert single value to array)
        UPDATE campaigns 
        SET languages_temp = CASE 
            WHEN language IS NOT NULL AND language != '' THEN ARRAY[language]
            ELSE '{}'
        END;
        
        -- Drop old column and rename new one
        ALTER TABLE campaigns DROP COLUMN language;
        ALTER TABLE campaigns RENAME COLUMN languages_temp TO languages;
    END IF;
END $$;

-- Convert category from TEXT to TEXT[] (if not already array)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'category' 
        AND data_type = 'text'
    ) THEN
        -- Create temporary column
        ALTER TABLE campaigns ADD COLUMN categories_temp TEXT[];
        
        -- Migrate existing data (convert single value to array)
        UPDATE campaigns 
        SET categories_temp = CASE 
            WHEN category IS NOT NULL AND category != '' THEN ARRAY[category]
            ELSE '{}'
        END;
        
        -- Drop old column and rename new one
        ALTER TABLE campaigns DROP COLUMN category;
        ALTER TABLE campaigns RENAME COLUMN categories_temp TO categories;
    END IF;
END $$;

-- ============================================
-- 2. UPDATE BIDS TABLE
-- ============================================

-- Add locations array field
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS locations TEXT[] DEFAULT '{}';

-- Convert language from TEXT to TEXT[] (if not already array)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bids' 
        AND column_name = 'language' 
        AND data_type = 'text'
    ) THEN
        -- Create temporary column
        ALTER TABLE bids ADD COLUMN languages_temp TEXT[];
        
        -- Migrate existing data (convert single value to array)
        UPDATE bids 
        SET languages_temp = CASE 
            WHEN language IS NOT NULL AND language != '' THEN ARRAY[language]
            ELSE '{}'
        END;
        
        -- Drop old column and rename new one
        ALTER TABLE bids DROP COLUMN language;
        ALTER TABLE bids RENAME COLUMN languages_temp TO languages;
    END IF;
END $$;

-- Convert category from TEXT to TEXT[] (if not already array)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bids' 
        AND column_name = 'category' 
        AND data_type = 'text'
    ) THEN
        -- Create temporary column
        ALTER TABLE bids ADD COLUMN categories_temp TEXT[];
        
        -- Migrate existing data (convert single value to array)
        UPDATE bids 
        SET categories_temp = CASE 
            WHEN category IS NOT NULL AND category != '' THEN ARRAY[category]
            ELSE '{}'
        END;
        
        -- Drop old column and rename new one
        ALTER TABLE bids DROP COLUMN category;
        ALTER TABLE bids RENAME COLUMN categories_temp TO categories;
    END IF;
END $$;

-- ============================================
-- 3. UPDATE USERS TABLE (for influencer discovery)
-- ============================================

-- Add influencer-specific fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS locations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS budget_range_min NUMERIC,
ADD COLUMN IF NOT EXISTS budget_range_max NUMERIC;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaigns_locations ON campaigns USING GIN (locations);
CREATE INDEX IF NOT EXISTS idx_campaigns_languages ON campaigns USING GIN (languages);
CREATE INDEX IF NOT EXISTS idx_campaigns_categories ON campaigns USING GIN (categories);

CREATE INDEX IF NOT EXISTS idx_bids_locations ON bids USING GIN (locations);
CREATE INDEX IF NOT EXISTS idx_bids_languages ON bids USING GIN (languages);
CREATE INDEX IF NOT EXISTS idx_bids_categories ON bids USING GIN (categories);

CREATE INDEX IF NOT EXISTS idx_users_categories ON users USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_users_languages ON users USING GIN (languages);
CREATE INDEX IF NOT EXISTS idx_users_locations ON users USING GIN (locations);
CREATE INDEX IF NOT EXISTS idx_users_budget_range ON users (budget_range_min, budget_range_max);

-- Add comments for documentation
COMMENT ON COLUMN campaigns.locations IS 'Array of locations where campaign is targeted';
COMMENT ON COLUMN campaigns.languages IS 'Array of languages required for campaign';
COMMENT ON COLUMN campaigns.categories IS 'Array of categories/niches for campaign';

COMMENT ON COLUMN bids.locations IS 'Array of locations where bid is targeted';
COMMENT ON COLUMN bids.languages IS 'Array of languages required for bid';
COMMENT ON COLUMN bids.categories IS 'Array of categories/niches for bid';

COMMENT ON COLUMN users.categories IS 'Array of categories/niches the influencer specializes in';
COMMENT ON COLUMN users.languages IS 'Array of languages the influencer can work in';
COMMENT ON COLUMN users.locations IS 'Array of locations the influencer operates in';
COMMENT ON COLUMN users.budget_range_min IS 'Minimum budget the influencer typically works with';
COMMENT ON COLUMN users.budget_range_max IS 'Maximum budget the influencer typically works with';
