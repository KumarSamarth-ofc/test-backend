-- =====================================================
-- Create MOU Documents Table
-- Stores all MOU documents separately for better management
-- =====================================================

CREATE TABLE IF NOT EXISTS mou_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    mou_content TEXT NOT NULL,
    mou_html TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one MOU per conversation
    UNIQUE(conversation_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mou_documents_conversation_id ON mou_documents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mou_documents_generated_at ON mou_documents(generated_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_mou_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mou_documents_updated_at
    BEFORE UPDATE ON mou_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_mou_documents_updated_at();

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. One MOU per conversation (enforced by UNIQUE constraint)
-- 2. MOU is automatically deleted if conversation is deleted (CASCADE)
-- 3. Indexes for fast lookups by conversation_id and generated_at
-- 4. Automatic timestamp management with triggers

