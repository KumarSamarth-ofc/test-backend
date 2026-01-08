const { supabaseAdmin } = require('../db/config');

/**
 * MOU Service
 * Handles business logic for MOU operations
 */
class MOUService {
  /**
   * Get the latest MOU for an application
   * @param {string} applicationId - Application UUID
   * @param {string} userId - User ID making the request
   * @param {string} userRole - User role (INFLUENCER, BRAND_OWNER, ADMIN)
   * @returns {Promise<Object>} - Latest MOU or error
   */
  async getLatestMOU(applicationId, userId, userRole) {
    try {
      // First, verify the application exists and user has access
      const { data: application, error: appError } = await supabaseAdmin
        .from('v1_applications')
        .select(`
          id,
          influencer_id,
          brand_id,
          v1_campaigns!inner(brand_id)
        `)
        .eq('id', applicationId)
        .maybeSingle();

      if (appError) {
        console.error('[MOUService/getLatestMOU] Application fetch error:', appError);
        return { success: false, message: 'Database error' };
      }

      if (!application) {
        return { success: false, message: 'Application not found' };
      }

      // Check access permissions
      if (userRole === 'INFLUENCER') {
        if (application.influencer_id !== userId) {
          return { success: false, message: 'You do not have access to this application' };
        }
      } else if (userRole === 'BRAND_OWNER') {
        // Brand owner access is via campaign's brand_id
        if (application.v1_campaigns.brand_id !== userId) {
          return { success: false, message: 'You do not have access to this application' };
        }
      }
      // ADMIN has access to all

      // Get the latest MOU for this application (by created_at desc)
      const { data: mous, error: mouError } = await supabaseAdmin
        .from('v1_mous')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (mouError) {
        console.error('[MOUService/getLatestMOU] MOU fetch error:', mouError);
        return { success: false, message: 'Database error' };
      }

      if (!mous || mous.length === 0) {
        return { 
          success: true, 
          message: 'No MOU found for this application',
          data: null 
        };
      }

      return {
        success: true,
        message: 'MOU fetched successfully',
        data: mous[0]
      };
    } catch (err) {
      console.error('[MOUService/getLatestMOU] Exception:', err);
      return {
        success: false,
        message: 'Failed to fetch MOU',
        error: err.message
      };
    }
  }

  /**
   * Accept a MOU
   * @param {string} mouId - MOU UUID
   * @param {string} userId - User ID accepting the MOU
   * @param {string} userRole - User role (INFLUENCER or BRAND_OWNER)
   * @returns {Promise<Object>} - Updated MOU or error
   */
  async acceptMOU(mouId, userId, userRole) {
    try {
      // Get the MOU with application details
      const { data: mou, error: mouError } = await supabaseAdmin
        .from('v1_mous')
        .select(`
          *,
          v1_applications!inner(
            id,
            influencer_id,
            brand_id,
            v1_campaigns!inner(brand_id)
          )
        `)
        .eq('id', mouId)
        .maybeSingle();

      if (mouError) {
        console.error('[MOUService/acceptMOU] MOU fetch error:', mouError);
        return { success: false, message: 'Database error' };
      }

      if (!mou) {
        return { success: false, message: 'MOU not found' };
      }

      const application = mou.v1_applications;

      // Validate user has access and can accept
      if (userRole === 'INFLUENCER') {
        if (application.influencer_id !== userId) {
          return { 
            success: false, 
            message: 'Only the influencer associated with this MOU can accept it as influencer' 
          };
        }
      } else if (userRole === 'BRAND_OWNER') {
        if (application.v1_campaigns.brand_id !== userId) {
          return { 
            success: false, 
            message: 'Only the brand owner associated with this MOU can accept it as brand' 
          };
        }
      } else {
        return { 
          success: false, 
          message: 'Only influencers and brand owners can accept MOUs' 
        };
      }

      // Check if already accepted by this party
      if (userRole === 'INFLUENCER' && mou.accepted_by_influencer) {
        return { 
          success: false, 
          message: 'MOU has already been accepted by the influencer' 
        };
      }

      if (userRole === 'BRAND_OWNER' && mou.accepted_by_brand) {
        return { 
          success: false, 
          message: 'MOU has already been accepted by the brand' 
        };
      }

      // Check if MOU is in a state that prevents acceptance
      // CANCELLED and EXPIRED always block acceptance
      if (['CANCELLED', 'EXPIRED'].includes(mou.status)) {
        return { 
          success: false, 
          message: `MOU cannot be accepted. Current status: ${mou.status}` 
        };
      }

      // For ACTIVE status, only block if both parties have actually accepted
      // (This handles cases where admin set status to ACTIVE but parties haven't accepted)
      if (mou.status === 'ACTIVE' && mou.accepted_by_influencer && mou.accepted_by_brand) {
        return { 
          success: false, 
          message: 'MOU has already been fully accepted by both parties' 
        };
      }

      // Prepare update data
      const now = new Date().toISOString();
      const updateData = {};

      if (userRole === 'INFLUENCER') {
        updateData.accepted_by_influencer = true;
        updateData.influencer_accepted_at = now;
      } else if (userRole === 'BRAND_OWNER') {
        updateData.accepted_by_brand = true;
        updateData.brand_accepted_at = now;
      }

      // Determine new status
      const willBeFullyAccepted = 
        (userRole === 'INFLUENCER' && mou.accepted_by_brand) ||
        (userRole === 'BRAND_OWNER' && mou.accepted_by_influencer);

      if (willBeFullyAccepted) {
        updateData.status = 'ACTIVE';
      } else if (mou.status === 'DRAFT') {
        // If status is DRAFT and first party accepts, change to SENT
        updateData.status = 'SENT';
      } else if (mou.status === 'ACTIVE' && !mou.accepted_by_influencer && !mou.accepted_by_brand) {
        // If status was set to ACTIVE by admin but no one has accepted yet, change to SENT on first acceptance
        updateData.status = 'SENT';
      }
      // If status is already SENT, keep it as SENT until both parties accept

      // Update MOU
      const { data: updatedMOU, error: updateError } = await supabaseAdmin
        .from('v1_mous')
        .update(updateData)
        .eq('id', mouId)
        .select()
        .single();

      if (updateError) {
        console.error('[MOUService/acceptMOU] Update error:', updateError);
        return { 
          success: false, 
          message: 'Failed to accept MOU',
          error: updateError.message 
        };
      }

      const fullyAccepted = updatedMOU.accepted_by_influencer && updatedMOU.accepted_by_brand;

      return {
        success: true,
        message: 'MOU accepted successfully',
        data: updatedMOU,
        fullyAccepted
      };
    } catch (err) {
      console.error('[MOUService/acceptMOU] Exception:', err);
      return {
        success: false,
        message: 'Failed to accept MOU',
        error: err.message
      };
    }
  }

  /**
   * Create a new MOU (Admin only)
   * @param {Object} mouData - MOU data
   * @param {string} mouData.application_id - Application UUID
   * @param {string} mouData.content - MOU content
   * @param {string} mouData.status - MOU status (optional, defaults to DRAFT)
   * @returns {Promise<Object>} - Created MOU or error
   */
  async createMOU(mouData) {
    try {
      const { application_id, content, status = 'DRAFT' } = mouData;

      // Validate required fields
      if (!application_id || !content) {
        return { 
          success: false, 
          message: 'application_id and content are required' 
        };
      }

      // Validate status
      const validStatuses = ['DRAFT', 'SENT', 'ACTIVE', 'CANCELLED', 'EXPIRED'];
      if (!validStatuses.includes(status)) {
        return { 
          success: false, 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        };
      }

      // Verify application exists
      const { data: application, error: appError } = await supabaseAdmin
        .from('v1_applications')
        .select('id')
        .eq('id', application_id)
        .maybeSingle();

      if (appError) {
        console.error('[MOUService/createMOU] Application check error:', appError);
        return { success: false, message: 'Database error' };
      }

      if (!application) {
        return { success: false, message: 'Application not found' };
      }

      // Get the latest MOU for this application to determine next template version
      const { data: existingMous, error: existingError } = await supabaseAdmin
        .from('v1_mous')
        .select('template_version')
        .eq('application_id', application_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingError) {
        console.error('[MOUService/createMOU] Existing MOU check error:', existingError);
        return { success: false, message: 'Database error' };
      }

      // Determine template version (numeric: 1, 2, 3, etc.)
      let templateVersion = 1;
      if (existingMous && existingMous.length > 0) {
        const latestVersion = existingMous[0].template_version;
        
        // Handle both numeric and string versions (for backward compatibility)
        if (typeof latestVersion === 'number') {
          templateVersion = latestVersion + 1;
        } else if (typeof latestVersion === 'string') {
          // If it's a string like "v1.0" or "1", extract the number
          const versionMatch = latestVersion.match(/v?(\d+)/);
          if (versionMatch) {
            templateVersion = parseInt(versionMatch[1], 10) + 1;
          } else {
            // If format is unexpected, default to 2
            templateVersion = 2;
          }
        } else {
          // If it's neither number nor string, default to 2
          templateVersion = 2;
        }
      }

      // Create new MOU
      const { data: newMOU, error: createError } = await supabaseAdmin
        .from('v1_mous')
        .insert({
          application_id,
          template_version: templateVersion,
          content,
          status,
          accepted_by_influencer: false,
          accepted_by_brand: false
        })
        .select()
        .single();

      if (createError) {
        console.error('[MOUService/createMOU] Create error:', createError);
        return { 
          success: false, 
          message: 'Failed to create MOU',
          error: createError.message 
        };
      }

      return {
        success: true,
        message: 'MOU created successfully',
        data: newMOU
      };
    } catch (err) {
      console.error('[MOUService/createMOU] Exception:', err);
      return {
        success: false,
        message: 'Failed to create MOU',
        error: err.message
      };
    }
  }
}

module.exports = new MOUService();

