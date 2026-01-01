const db = require('../../db');
const { canTransition } = require('./applicationStateMachine');

class ApplicationService {
  /**
   * Check if brand owns the campaign (via application)
   */
  async checkBrandOwnership(applicationId, brandId) {
    try {
      const app = await db.oneOrNone(
        `SELECT a.*, c.brand_id 
        FROM applications a
        JOIN campaigns c ON a.campaign_id = c.id
        WHERE a.id = $1`,
        [applicationId]
      );

      if (!app) {
        return { success: false, message: 'Application not found' };
      }

      if (app.brand_id !== brandId) {
        return { success: false, message: 'Unauthorized: Not your campaign' };
      }

      return { success: true, application: app };
    } catch (err) {
      console.error('[ApplicationService/checkBrandOwnership] Error:', err);
      return { success: false, message: 'Database error' };
    }
  }

  /**
   * Check if user can cancel application (influencer or brand owner)
   */
  async checkCancelPermission(applicationId, userId, userRole) {
    try {
      const app = await db.oneOrNone(
        `SELECT a.*, c.brand_id 
        FROM applications a
        JOIN campaigns c ON a.campaign_id = c.id
        WHERE a.id = $1`,
        [applicationId]
      );

      if (!app) {
        return { success: false, message: 'Application not found' };
      }

      // Influencer can cancel their own application
      if (userRole === 'INFLUENCER' && app.influencer_id === userId) {
        return { success: true, application: app };
      }

      // Brand owner can cancel applications to their campaigns
      if (userRole === 'BRAND' && app.brand_id === userId) {
        return { success: true, application: app };
      }

      return { success: false, message: 'Unauthorized: Cannot cancel this application' };
    } catch (err) {
      console.error('[ApplicationService/checkCancelPermission] Error:', err);
      return { success: false, message: 'Database error' };
    }
  }

  /**
   * Apply to a campaign
   */
  async apply({ campaignId, influencerId }) {
    try {
      // Check if campaign exists and is in valid state
      const campaign = await db.oneOrNone(
        'SELECT * FROM campaigns WHERE id = $1',
        [campaignId]
      );

      if (!campaign) {
        return { success: false, message: 'Campaign not found' };
      }

      if (!['LIVE', 'ACTIVE'].includes(campaign.status)) {
        return { success: false, message: 'Campaign is not accepting applications' };
      }

      // Check for duplicate application
      const existing = await db.oneOrNone(
        'SELECT * FROM applications WHERE campaign_id = $1 AND influencer_id = $2',
        [campaignId, influencerId]
      );

      if (existing) {
        return { success: false, message: 'You have already applied to this campaign' };
      }

      const app = await db.one(
        `INSERT INTO applications (campaign_id, influencer_id, status)
        VALUES ($1, $2, 'PENDING')
        RETURNING *`,
        [campaignId, influencerId]
      );

      return {
        success: true,
        message: 'Application submitted successfully',
        application: app,
      };
    } catch (err) {
      console.error('[ApplicationService/apply] Error:', err);
      return {
        success: false,
        message: err.message || 'Failed to apply to campaign',
      };
    }
  }

  /**
   * Accept an application
   */
  async accept({
    applicationId,
    brandId,
    agreedAmount,
    platformFeePercent,
    requiresScript,
  }) {
    try {
      return await db.tx(async (t) => {
        // Check ownership
        const ownershipCheck = await this.checkBrandOwnership(applicationId, brandId);
        if (!ownershipCheck.success) {
          return ownershipCheck;
        }

        const app = ownershipCheck.application;

        // Check state transition
        if (!canTransition(app.status, 'ACCEPTED')) {
          return {
            success: false,
            message: `Cannot accept application. Current status: ${app.status}`,
          };
        }

        const platformFeeAmount = (agreedAmount * platformFeePercent) / 100;
        const netAmount = agreedAmount - platformFeeAmount;
        const phase = requiresScript ? 'SCRIPT' : 'WORK';

        const updated = await t.one(
          `
          UPDATE applications
          SET
            status = 'ACCEPTED',
            phase = $2,
            agreed_amount = $3,
            platform_fee_percent = $4,
            platform_fee_amount = $5,
            net_amount = $6,
            brand_id = $7,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
          `,
          [
            applicationId,
            phase,
            agreedAmount,
            platformFeePercent,
            platformFeeAmount,
            netAmount,
            brandId,
          ]
        );

        return {
          success: true,
          message: 'Application accepted successfully',
          application: updated,
        };
      });
    } catch (err) {
      console.error('[ApplicationService/accept] Error:', err);
      return {
        success: false,
        message: err.message || 'Failed to accept application',
      };
    }
  }

  /**
   * Cancel an application
   */
  async cancel({ applicationId, user }) {
    try {
      // Check permission
      const permissionCheck = await this.checkCancelPermission(
        applicationId,
        user.id,
        user.role
      );
      if (!permissionCheck.success) {
        return permissionCheck;
      }

      const app = permissionCheck.application;

      // Check state transition
      if (!canTransition(app.status, 'CANCELLED')) {
        return {
          success: false,
          message: `Cannot cancel application. Current status: ${app.status}`,
        };
      }

      const updated = await db.one(
        `
        UPDATE applications
        SET status = 'CANCELLED', updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [applicationId]
      );

      return {
        success: true,
        message: 'Application cancelled successfully',
        application: updated,
      };
    } catch (err) {
      console.error('[ApplicationService/cancel] Error:', err);
      return {
        success: false,
        message: err.message || 'Failed to cancel application',
      };
    }
  }

  /**
   * Complete an application (Admin only)
   */
  async complete(applicationId) {
    try {
      const app = await db.oneOrNone(
        'SELECT * FROM applications WHERE id = $1',
        [applicationId]
      );

      if (!app) {
        return { success: false, message: 'Application not found' };
      }

      // Check state transition
      if (!canTransition(app.status, 'COMPLETED')) {
        return {
          success: false,
          message: `Cannot complete application. Current status: ${app.status}`,
        };
      }

      const updated = await db.one(
        `
        UPDATE applications
        SET status = 'COMPLETED', updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [applicationId]
      );

      return {
        success: true,
        message: 'Application completed successfully',
        application: updated,
      };
    } catch (err) {
      console.error('[ApplicationService/complete] Error:', err);
      return {
        success: false,
        message: err.message || 'Failed to complete application',
      };
    }
  }
}

module.exports = new ApplicationService();