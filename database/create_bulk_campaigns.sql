-- Create bulk_campaigns table
CREATE TABLE IF NOT EXISTS public.bulk_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open', -- open, closed, completed, paused
    budget NUMERIC,
    requirements TEXT,
    deliverables JSONB, -- Array of deliverables e.g. ["Reel", "Story"]
    platform TEXT, -- instagram, youtube, etc
    image_url TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Enable RLS for bulk_campaigns
ALTER TABLE public.bulk_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies for bulk_campaigns
CREATE POLICY "Public campaigns are viewable by everyone" 
    ON public.bulk_campaigns FOR SELECT 
    USING (true);

CREATE POLICY "Brand owners can insert their own campaigns" 
    ON public.bulk_campaigns FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Brand owners can update their own campaigns" 
    ON public.bulk_campaigns FOR UPDATE 
    USING (auth.uid() = created_by);

CREATE POLICY "Brand owners can delete their own campaigns" 
    ON public.bulk_campaigns FOR DELETE 
    USING (auth.uid() = created_by);


-- Create bulk_submissions table (Linking influencers to bulk_campaigns)
CREATE TABLE IF NOT EXISTS public.bulk_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    bulk_campaign_id UUID REFERENCES public.bulk_campaigns(id) ON DELETE CASCADE,
    influencer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Status pipeline: applied -> approved -> work_submitted -> completed (or rejected)
    status TEXT DEFAULT 'applied', 
    
    -- Financials
    proposed_amount NUMERIC,
    final_agreed_amount NUMERIC,
    
    -- Application details
    message TEXT, -- Initial application message
    
    -- Work Submission details
    work_submission_link TEXT,
    work_description TEXT,
    work_files JSONB, -- Array of file URLs
    work_submission_date TIMESTAMP WITH TIME ZONE,
    work_approval_date TIMESTAMP WITH TIME ZONE,
    
    -- Revocation/Rejection
    rejection_reason TEXT,
    revoke_count INTEGER DEFAULT 0,
    max_revokes INTEGER DEFAULT 3,
    
    -- Constraint to prevent duplicate applications
    UNIQUE(bulk_campaign_id, influencer_id)
);

-- Enable RLS for bulk_submissions
ALTER TABLE public.bulk_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for bulk_submissions
CREATE POLICY "Users can see their own submissions" 
    ON public.bulk_submissions FOR SELECT 
    USING (auth.uid() = influencer_id);

CREATE POLICY "Brand owners can see submissions for their campaigns" 
    ON public.bulk_submissions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.bulk_campaigns 
            WHERE id = public.bulk_submissions.bulk_campaign_id 
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Influencers can insert submissions" 
    ON public.bulk_submissions FOR INSERT 
    WITH CHECK (auth.uid() = influencer_id);

CREATE POLICY "Influencers can update their own submissions" 
    ON public.bulk_submissions FOR UPDATE 
    USING (auth.uid() = influencer_id);

CREATE POLICY "Brand owners can update submissions for their campaigns" 
    ON public.bulk_submissions FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.bulk_campaigns 
            WHERE id = public.bulk_submissions.bulk_campaign_id 
            AND created_by = auth.uid()
        )
    );

-- Add triggers for updated_at if needed (omitted for brevity, usually handled by extensions or app logic)
