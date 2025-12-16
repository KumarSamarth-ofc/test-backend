const { supabaseAdmin } = require("../supabase/client");

class BulkCampaignController {

    /**
     * Get Dashboard Stats (Pulse Check)
     * GET /dashboard/stats
     */
    async getDashboardStats(req, res) {
        try {
            const userId = req.user.id;

            // 1. Active Campaigns Count (bulk_campaigns where status='active')
            const { count: activeCampaignsCount, error: activeError } = await supabaseAdmin
                .from('bulk_campaigns')
                .select('*', { count: 'exact', head: true })
                .eq('created_by', userId)
                .eq('status', 'active');

            if (activeError) throw activeError;

            // 2. Total Creators (Unique count across active bulk campaigns)
            // fetch influencer_ids from bulk_submissions where campaign is active
            const { data: activeCreators, error: creatorsError } = await supabaseAdmin
                .from('bulk_submissions')
                .select('influencer_id, bulk_campaigns!inner(status)')
                .eq('bulk_campaigns.created_by', userId)
                .eq('bulk_campaigns.status', 'active')
                .in('status', ['approved', 'work_submitted', 'completed']); // 'active' creators

            if (creatorsError) throw creatorsError;

            const uniqueCreators = new Set(activeCreators.map(s => s.influencer_id)).size;

            // 3. Pending Actions
            // Submission Reviews: status = 'work_submitted'
            const { count: submissionReviews, error: subError } = await supabaseAdmin
                .from('bulk_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'work_submitted')
                // Ensure linked to user's campaigns
                .match({ 'bulk_campaigns.created_by': userId });
            // Note: Supabase JS select with inner join usually requires explicit filters or rpc if complex
            // Let's use the explicit relation filter approach

            const { data: pendingSubmissions, error: pendingSubError } = await supabaseAdmin
                .from('bulk_submissions')
                .select('id, bulk_campaigns!inner(created_by)')
                .eq('bulk_campaigns.created_by', userId)
                .eq('status', 'work_submitted');

            if (pendingSubError) throw pendingSubError;
            const submissionReviewsCount = pendingSubmissions.length;

            // Application Reviews: status = 'applied'
            const { data: pendingApplications, error: pendingAppError } = await supabaseAdmin
                .from('bulk_submissions')
                .select('id, bulk_campaigns!inner(created_by)')
                .eq('bulk_campaigns.created_by', userId)
                .eq('status', 'applied');

            if (pendingAppError) throw pendingAppError;
            const applicationReviewsCount = pendingApplications.length;

            // 4. Financials
            // Total Budget Committed: Sum of budget of all active campaigns? Or sum of agreed amounts?
            // Requirement says: "Total Budget Committed" and "Total Spent (Approved deliverables)"

            // Get all campaigns to sum budget
            const { data: campaigns, error: campError } = await supabaseAdmin
                .from('bulk_campaigns')
                .select('budget, id')
                .eq('created_by', userId)
                .neq('status', 'draft'); // Assuming drafted budget isn't committed

            if (campError) throw campError;
            const totalBudgetCommitted = campaigns.reduce((sum, c) => sum + (parseFloat(c.budget) || 0), 0);

            // Get all approved submissions to sum spent
            const { data: approvedSubmissions, error: spentError } = await supabaseAdmin
                .from('bulk_submissions')
                .select('final_agreed_amount, bulk_campaigns!inner(created_by)')
                .eq('bulk_campaigns.created_by', userId)
                .eq('status', 'completed'); // or 'work_approved' depending on lifecycle

            if (spentError) throw spentError;
            const totalSpent = approvedSubmissions.reduce((sum, s) => sum + (parseFloat(s.final_agreed_amount) || 0), 0);


            // 5. Widgets Data (Simplified for now)
            // Recent Campaigns
            const { data: recentCampaigns, error: recentError } = await supabaseAdmin
                .from('bulk_campaigns')
                .select('id, title, status, updated_at')
                .eq('created_by', userId)
                .order('updated_at', { ascending: false })
                .limit(3);

            if (recentError) throw recentError;

            res.json({
                success: true,
                data: {
                    kpis: {
                        active_campaigns: activeCampaignsCount || 0,
                        total_creators: uniqueCreators,
                        pending_actions: {
                            submission_reviews: submissionReviewsCount,
                            application_reviews: applicationReviewsCount
                        },
                        financials: {
                            total_budget_committed: totalBudgetCommitted,
                            total_spent: totalSpent
                        }
                    },
                    widgets: {
                        recent_campaigns: recentCampaigns,
                        // placeholders for others
                        activity_feed: [],
                        performance_chart: []
                    }
                }
            });

        } catch (error) {
            console.error("Error getting dashboard stats:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    /**
     * Get Bulk Campaigns List
     * Handled via GET /campaigns?type=BULK
     */
    async getBulkCampaigns(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10, status } = req.query;
            const offset = (page - 1) * limit;

            let query = supabaseAdmin
                .from('bulk_campaigns')
                .select(`
          *,
          bulk_submissions(count)
        `)
                .eq('created_by', userId);

            if (status) {
                query = query.eq('status', status);
            }

            const { data: campaigns, error, count } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            // START: Enriched counters (invited, applied, accepted, pending)
            // Since supabase raw queries are limited, we might need a separate aggregation or rpc 
            // For now, we'll do a secondary query to get counts per campaign if volume is low, 
            // or rely on a view. Let's do a simple group by or separate counts for now to be safe and accurate.

            // Fetch all submissions for these campaigns to aggregate in memory (efficient for page=10)
            const campaignIds = campaigns.map(c => c.id);
            let statsMap = {};

            if (campaignIds.length > 0) {
                const { data: submissions } = await supabaseAdmin
                    .from('bulk_submissions')
                    .select('bulk_campaign_id, status')
                    .in('bulk_campaign_id', campaignIds);

                submissions?.forEach(sub => {
                    if (!statsMap[sub.bulk_campaign_id]) {
                        statsMap[sub.bulk_campaign_id] = { applied: 0, accepted: 0, pending: 0, invited: 0 };
                    }
                    const s = statsMap[sub.bulk_campaign_id];

                    if (sub.status === 'applied') s.applied++;
                    if (['approved', 'work_submitted', 'completed'].includes(sub.status)) s.accepted++;
                    if (sub.status === 'work_submitted') s.pending++;
                    // invited not tracked in submissions table usually, unless status='invited'. Assuming separate table or logic.
                });
            }

            const enrichedCampaigns = campaigns.map(c => ({
                ...c,
                budget_total: c.budget,
                // budget_remaining logic would go here
                counters: {
                    applied_count: statsMap[c.id]?.applied || 0,
                    accepted_count: statsMap[c.id]?.accepted || 0,
                    submissions_pending_count: statsMap[c.id]?.pending || 0,
                    invited_count: 0 // Placeholder as invites table not defined yet
                }
            }));

            res.json({
                success: true,
                campaigns: enrichedCampaigns,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    pages: Math.ceil((count || 0) / limit),
                }
            });

        } catch (error) {
            console.error("Error getting bulk campaigns:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
}

module.exports = new BulkCampaignController();
