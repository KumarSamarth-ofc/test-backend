const { supabaseAdmin } = require('../supabase/client');
const { body, validationResult, query } = require('express-validator');

class CampaignController {
    /**
     * Create a new campaign
     */
    async createCampaign(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const userId = req.user.id;
            const campaignData = req.body;

            // Ensure only brand owners can create campaigns
            if (req.user.role !== 'brand_owner' && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Only brand owners can create campaigns'
                });
            }

            const { data: campaign, error } = await supabaseAdmin
                .from('campaigns')
                .insert({
                    ...campaignData,
                    created_by: userId
                })
                .select()
                .single();

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create campaign'
                });
            }

            res.status(201).json({
                success: true,
                campaign: campaign,
                message: 'Campaign created successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get all campaigns with filtering and pagination
     */
    async getCampaigns(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                min_budget,
                max_budget,
                search,
                category
            } = req.query;

            const offset = (page - 1) * limit;
            let query = supabaseAdmin
                .from('campaigns')
                .select(`
                    *,
                    created_by_user:users!campaigns_created_by_fkey (
                        id,
                        phone,
                        email,
                        role
                    ),
                    requests_count:requests(count)
                `);

            // Apply filters
            if (status) {
                query = query.eq('status', status);
            }
            if (min_budget) {
                query = query.gte('budget', min_budget);
            }
            if (max_budget) {
                query = query.lte('budget', max_budget);
            }
            if (search) {
                query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
            }

            // Apply role-based filtering
            if (req.user.role === 'influencer') {
                // Influencers can only see campaigns they've interacted with or open campaigns
                query = query.or(`status.eq.open,status.eq.pending`);
            } else if (req.user.role === 'brand_owner') {
                // Brand owners can only see their own campaigns
                query = query.eq('created_by', req.user.id);
            }
            // Admin can see all campaigns

            const { data: campaigns, error, count } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch campaigns'
                });
            }

            res.json({
                success: true,
                campaigns: campaigns,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    pages: Math.ceil((count || 0) / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get a specific campaign by ID
     */
    async getCampaign(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            let query = supabaseAdmin
                .from('campaigns')
                .select(`
                    *,
                    created_by_user:users!campaigns_created_by_fkey (
                        id,
                        phone,
                        email,
                        role
                    ),
                    requests (
                        id,
                        status,
                        created_at,
                        influencer:users!requests_influencer_id_fkey (
                            id,
                            phone,
                            email,
                            role,
                            languages,
                            categories,
                            min_range,
                            max_range
                        )
                    )
                `)
                .eq('id', id);

            const { data: campaign, error } = await query.single();

            if (error || !campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            // Check access permissions
            if (req.user.role === 'brand_owner' && campaign.created_by !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            if (req.user.role === 'influencer') {
                // Check if influencer has interacted with this campaign
                const hasInteraction = campaign.requests.some(
                    request => request.influencer.id === userId
                );
                if (!hasInteraction && campaign.status !== 'open') {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied'
                    });
                }
            }

            res.json({
                success: true,
                campaign: campaign
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Update a campaign
     */
    async updateCampaign(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const userId = req.user.id;
            const updateData = req.body;

            // Check if campaign exists and user has permission
            const { data: existingCampaign, error: checkError } = await supabaseAdmin
                .from('campaigns')
                .select('created_by')
                .eq('id', id)
                .single();

            if (checkError || !existingCampaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            if (existingCampaign.created_by !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const { data: campaign, error } = await supabaseAdmin
                .from('campaigns')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update campaign'
                });
            }

            res.json({
                success: true,
                campaign: campaign,
                message: 'Campaign updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Delete a campaign
     */
    async deleteCampaign(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Check if campaign exists and user has permission
            const { data: existingCampaign, error: checkError } = await supabaseAdmin
                .from('campaigns')
                .select('created_by')
                .eq('id', id)
                .single();

            if (checkError || !existingCampaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            if (existingCampaign.created_by !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const { error } = await supabaseAdmin
                .from('campaigns')
                .delete()
                .eq('id', id);

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete campaign'
                });
            }

            res.json({
                success: true,
                message: 'Campaign deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get campaign statistics
     */
    async getCampaignStats(req, res) {
        try {
            const userId = req.user.id;

            let query = supabaseAdmin
                .from('campaigns')
                .select('status, budget');

            // Apply role-based filtering
            if (req.user.role === 'brand_owner') {
                query = query.eq('created_by', userId);
            } else if (req.user.role === 'influencer') {
                // Get campaigns where influencer has requests
                query = supabaseAdmin
                    .from('requests')
                    .select(`
                        campaigns (
                            status,
                            budget
                        )
                    `)
                    .eq('influencer_id', userId);
            }

            const { data, error } = await query;

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch statistics'
                });
            }

            // Calculate statistics
            const campaigns = req.user.role === 'influencer' 
                ? data.map(item => item.campaigns).filter(Boolean)
                : data;

            const stats = {
                total: campaigns.length,
                byStatus: {},
                totalBudget: 0
            };

            campaigns.forEach(campaign => {
                // Status stats
                stats.byStatus[campaign.status] = (stats.byStatus[campaign.status] || 0) + 1;
                
                // Budget
                stats.totalBudget += parseFloat(campaign.budget || 0);
            });

            res.json({
                success: true,
                stats: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

// Validation middleware
const validateCreateCampaign = [
    body('title')
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters'),
    body('budget')
        .isFloat({ min: 0 })
        .withMessage('Budget must be a positive number'),
    body('start_date')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date'),
    body('end_date')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date'),
    body('requirements')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('Requirements must be less than 2000 characters'),
    body('deliverables')
        .optional()
        .isArray()
        .withMessage('Deliverables must be an array')
];

const validateUpdateCampaign = [
    body('title')
        .optional()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters'),
    body('budget')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Budget must be a positive number'),
    body('start_date')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date'),
    body('end_date')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date'),
    body('requirements')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('Requirements must be less than 2000 characters'),
    body('deliverables')
        .optional()
        .isArray()
        .withMessage('Deliverables must be an array')
];

module.exports = {
    CampaignController: new CampaignController(),
    validateCreateCampaign,
    validateUpdateCampaign
}; 