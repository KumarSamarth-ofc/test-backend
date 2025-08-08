const { supabaseAdmin } = require('../supabase/client');
const { body, validationResult, query } = require('express-validator');

class BidController {
    /**
     * Create a new bid
     */
    async createBid(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const userId = req.user.id;
            const bidData = req.body;

            // Ensure only brand owners can create bids
            if (req.user.role !== 'brand_owner' && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Only brand owners can create bids'
                });
            }

            const { data: bid, error } = await supabaseAdmin
                .from('bids')
                .insert({
                    ...bidData,
                    created_by: userId
                })
                .select()
                .single();

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create bid'
                });
            }

            res.status(201).json({
                success: true,
                bid: bid,
                message: 'Bid created successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get all bids with filtering and pagination
     */
    async getBids(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                min_budget,
                max_budget,
                search
            } = req.query;

            const offset = (page - 1) * limit;
            let query = supabaseAdmin
                .from('bids')
                .select(`
                    *,
                    created_by_user:users!bids_created_by_fkey (
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
                // Influencers can only see bids they've interacted with or open bids
                query = query.or(`status.eq.open,status.eq.pending`);
            } else if (req.user.role === 'brand_owner') {
                // Brand owners can only see their own bids
                query = query.eq('created_by', req.user.id);
            }
            // Admin can see all bids

            const { data: bids, error, count } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch bids'
                });
            }

            res.json({
                success: true,
                bids: bids,
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
     * Get a specific bid by ID
     */
    async getBid(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            let query = supabaseAdmin
                .from('bids')
                .select(`
                    *,
                    created_by_user:users!bids_created_by_fkey (
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

            const { data: bid, error } = await query.single();

            if (error || !bid) {
                return res.status(404).json({
                    success: false,
                    message: 'Bid not found'
                });
            }

            // Check access permissions
            if (req.user.role === 'brand_owner' && bid.created_by !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            if (req.user.role === 'influencer') {
                // Check if influencer has interacted with this bid
                const hasInteraction = bid.requests.some(
                    request => request.influencer.id === userId
                );
                if (!hasInteraction && bid.status !== 'open') {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied'
                    });
                }
            }

            res.json({
                success: true,
                bid: bid
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Update a bid
     */
    async updateBid(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const userId = req.user.id;
            const updateData = req.body;

            // Check if bid exists and user has permission
            const { data: existingBid, error: checkError } = await supabaseAdmin
                .from('bids')
                .select('created_by')
                .eq('id', id)
                .single();

            if (checkError || !existingBid) {
                return res.status(404).json({
                    success: false,
                    message: 'Bid not found'
                });
            }

            if (existingBid.created_by !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const { data: bid, error } = await supabaseAdmin
                .from('bids')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update bid'
                });
            }

            res.json({
                success: true,
                bid: bid,
                message: 'Bid updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Delete a bid
     */
    async deleteBid(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Check if bid exists and user has permission
            const { data: existingBid, error: checkError } = await supabaseAdmin
                .from('bids')
                .select('created_by')
                .eq('id', id)
                .single();

            if (checkError || !existingBid) {
                return res.status(404).json({
                    success: false,
                    message: 'Bid not found'
                });
            }

            if (existingBid.created_by !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const { error } = await supabaseAdmin
                .from('bids')
                .delete()
                .eq('id', id);

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete bid'
                });
            }

            res.json({
                success: true,
                message: 'Bid deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get bid statistics
     */
    async getBidStats(req, res) {
        try {
            const userId = req.user.id;

            let query = supabaseAdmin
                .from('bids')
                .select('status, budget');

            // Apply role-based filtering
            if (req.user.role === 'brand_owner') {
                query = query.eq('created_by', userId);
            } else if (req.user.role === 'influencer') {
                // Get bids where influencer has requests
                query = supabaseAdmin
                    .from('requests')
                    .select(`
                        bids (
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
            const bids = req.user.role === 'influencer' 
                ? data.map(item => item.bids).filter(Boolean)
                : data;

            const stats = {
                total: bids.length,
                byStatus: {},
                totalBudget: 0
            };

            bids.forEach(bid => {
                // Status stats
                stats.byStatus[bid.status] = (stats.byStatus[bid.status] || 0) + 1;
                
                // Budget
                stats.totalBudget += parseFloat(bid.budget || 0);
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
const validateCreateBid = [
    body('title')
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters'),
    body('budget')
        .isFloat({ min: 0 })
        .withMessage('Budget must be a positive number')
];

const validateUpdateBid = [
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
        .withMessage('Budget must be a positive number')
];

module.exports = {
    BidController: new BidController(),
    validateCreateBid,
    validateUpdateBid
}; 