const { supabaseAdmin } = require('../supabase/client');

class CommissionSettingsController {
  /**
   * Get current active commission rate
   * @route GET /api/admin/commission/current
   */
  async getCurrentCommission(req, res) {
    try {
      const { data: commission, error } = await supabaseAdmin
        .from('commission_settings')
        .select('*')
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch commission settings',
          details: error.message
        });
      }

      if (!commission) {
        return res.status(404).json({
          success: false,
          error: 'No active commission settings found'
        });
      }

      res.json({
        success: true,
        data: {
          id: commission.id,
          commission_percentage: commission.commission_percentage,
          effective_from: commission.effective_from,
          created_at: commission.created_at
        }
      });
    } catch (error) {
      console.error('Error fetching current commission:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update commission percentage (admin only)
   * @route PUT /api/admin/commission/update
   */
  async updateCommission(req, res) {
    try {
      const { commission_percentage } = req.body;

      // Validate input
      if (!commission_percentage || isNaN(commission_percentage)) {
        return res.status(400).json({
          success: false,
          error: 'Valid commission percentage is required'
        });
      }

      const percentage = parseFloat(commission_percentage);
      if (percentage < 0 || percentage > 100) {
        return res.status(400).json({
          success: false,
          error: 'Commission percentage must be between 0 and 100'
        });
      }

      // Deactivate current active settings
      const { error: deactivateError } = await supabaseAdmin
        .from('commission_settings')
        .update({ is_active: false })
        .eq('is_active', true);

      if (deactivateError) {
        console.error('Error deactivating old settings:', deactivateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update commission settings'
        });
      }

      // Create new commission setting
      const { data: newCommission, error: createError } = await supabaseAdmin
        .from('commission_settings')
        .insert({
          commission_percentage: percentage,
          is_active: true,
          effective_from: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating new commission setting:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create new commission setting'
        });
      }

      res.json({
        success: true,
        message: 'Commission percentage updated successfully',
        data: {
          id: newCommission.id,
          commission_percentage: newCommission.commission_percentage,
          effective_from: newCommission.effective_from,
          created_at: newCommission.created_at
        }
      });
    } catch (error) {
      console.error('Error updating commission:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get commission change history
   * @route GET /api/admin/commission/history
   */
  async getCommissionHistory(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { data: history, error } = await supabaseAdmin
        .from('commission_settings')
        .select('*')
        .order('effective_from', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch commission history',
          details: error.message
        });
      }

      // Get total count
      const { count, error: countError } = await supabaseAdmin
        .from('commission_settings')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error getting count:', countError);
      }

      res.json({
        success: true,
        data: history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching commission history:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new CommissionSettingsController();
