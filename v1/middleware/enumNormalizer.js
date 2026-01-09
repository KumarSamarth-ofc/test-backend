function normalizeEnums(req, res, next) {
  if (req.body) {
    if (req.body.gender !== undefined && req.body.gender !== null) {
      const normalized = String(req.body.gender).toUpperCase().trim();
      const validGenders = ["MALE", "FEMALE", "OTHER"];
      if (validGenders.includes(normalized)) {
        req.body.gender = normalized;
      }
    }

    if (req.body.tier !== undefined && req.body.tier !== null) {
      const normalized = String(req.body.tier).toUpperCase().trim();
      const validTiers = ["NANO", "MICRO", "MID", "MACRO"];
      if (validTiers.includes(normalized)) {
        req.body.tier = normalized;
      }
    }

    if (req.body.influencer_tier !== undefined && req.body.influencer_tier !== null) {
      const normalized = String(req.body.influencer_tier).toUpperCase().trim();
      const validTiers = ["NANO", "MICRO", "MID", "MACRO"];
      if (validTiers.includes(normalized)) {
        req.body.influencer_tier = normalized;
      }
    }

    if (req.body.type !== undefined && req.body.type !== null) {
      const normalized = String(req.body.type).toUpperCase().trim();
      const validTypes = ["NORMAL", "BULK"];
      if (validTypes.includes(normalized)) {
        req.body.type = normalized;
      }
    }

    if (req.body.status !== undefined && req.body.status !== null) {
      const normalized = String(req.body.status).toUpperCase().trim();
      const validStatuses = ["DRAFT", "LIVE", "LOCKED", "ACTIVE", "COMPLETED", "EXPIRED", "CANCELLED"];
      if (validStatuses.includes(normalized)) {
        req.body.status = normalized;
      }
    }

    // Billing cycle enum
    if (req.body.billing_cycle !== undefined && req.body.billing_cycle !== null) {
      const normalized = String(req.body.billing_cycle).toUpperCase().trim();
      const validBillingCycles = ["MONTHLY", "YEARLY"];
      if (validBillingCycles.includes(normalized)) {
        req.body.billing_cycle = normalized;
      }
    }

    // Application phase enum
    if (req.body.phase !== undefined && req.body.phase !== null) {
      const normalized = String(req.body.phase).toUpperCase().trim();
      const validPhases = ["APPLIED", "ACCEPTED", "SCRIPT", "WORK", "COMPLETED", "CANCELLED"];
      if (validPhases.includes(normalized)) {
        req.body.phase = normalized;
      }
    }

    if (req.body.status !== undefined && req.body.status !== null) {
      const normalized = String(req.body.status).toUpperCase().trim();
      const validSubmissionStatuses = ["PENDING", "ACCEPTED", "REVISION", "REJECTED"];
      if (validSubmissionStatuses.includes(normalized)) {
        req.body.status = normalized;
      }
    }

    if (req.body.entity_type !== undefined && req.body.entity_type !== null) {
      const normalized = String(req.body.entity_type).toUpperCase().trim();
      const validEntityTypes = ["SCRIPT", "WORK"];
      if (validEntityTypes.includes(normalized)) {
        req.body.entity_type = normalized;
      }
    }

    if (req.body.rejected_by_role !== undefined && req.body.rejected_by_role !== null) {
      const normalized = String(req.body.rejected_by_role).toUpperCase().trim();
      const validRoles = ["BRAND", "ADMIN"];
      if (validRoles.includes(normalized)) {
        req.body.rejected_by_role = normalized;
      }
    }

    if (req.body.role !== undefined && req.body.role !== null) {
      const normalized = String(req.body.role).toUpperCase().trim();
      const validRoles = ["BRAND_OWNER", "INFLUENCER", "ADMIN"];
      if (validRoles.includes(normalized)) {
        req.body.role = normalized;
      }
    }

    if (Array.isArray(req.body.social_platforms)) {
      req.body.social_platforms = req.body.social_platforms.map((platform) => {
        const normalized = { ...platform };
        
        if (normalized.platform_name || normalized.platform || normalized.platformName) {
          const platformName = normalized.platform_name || normalized.platform || normalized.platformName;
          const normalizedPlatform = String(platformName).toUpperCase().trim();
          const validPlatforms = ["INSTAGRAM", "FACEBOOK", "YOUTUBE"];
          if (validPlatforms.includes(normalizedPlatform)) {
            normalized.platform_name = normalizedPlatform;
            normalized.platform = normalizedPlatform;
            normalized.platformName = normalizedPlatform;
          }
        }

        if (normalized.data_source !== undefined && normalized.data_source !== null) {
          const normalizedDataSource = String(normalized.data_source).toUpperCase().trim();
          const validDataSources = ["MANUAL", "GRAPH_API"];
          if (validDataSources.includes(normalizedDataSource)) {
            normalized.data_source = normalizedDataSource;
          }
        }

        return normalized;
      });
    }

    if (req.query) {
      if (req.query.status !== undefined && req.query.status !== null) {
        const normalized = String(req.query.status).toUpperCase().trim();
        const validStatuses = ["DRAFT", "LIVE", "LOCKED", "ACTIVE", "COMPLETED", "EXPIRED", "CANCELLED"];
        if (validStatuses.includes(normalized)) {
          req.query.status = normalized;
        }
      }

      if (req.query.type !== undefined && req.query.type !== null) {
        const normalized = String(req.query.type).toUpperCase().trim();
        const validTypes = ["NORMAL", "BULK"];
        if (validTypes.includes(normalized)) {
          req.query.type = normalized;
        }
      }

      if (req.query.phase !== undefined && req.query.phase !== null) {
        const normalized = String(req.query.phase).toUpperCase().trim();
        const validPhases = ["APPLIED", "ACCEPTED", "SCRIPT", "WORK", "COMPLETED", "CANCELLED"];
        if (validPhases.includes(normalized)) {
          req.query.phase = normalized;
        }
      }

      if (req.query.status !== undefined && req.query.status !== null) {
        const normalized = String(req.query.status).toUpperCase().trim();
        const validSubmissionStatuses = ["PENDING", "ACCEPTED", "REVISION", "REJECTED"];
        if (validSubmissionStatuses.includes(normalized)) {
          req.query.status = normalized;
        }
      }

      if (req.query.payout_status !== undefined && req.query.payout_status !== null) {
        const normalized = String(req.query.payout_status).toUpperCase().trim();
        const validPayoutStatuses = ["PENDING", "RELEASED", "FAILED"];
        if (validPayoutStatuses.includes(normalized)) {
          req.query.payout_status = normalized;
        }
      }

      if (req.query.payment_status !== undefined && req.query.payment_status !== null) {
        const normalized = String(req.query.payment_status).toUpperCase().trim();
        const validPaymentStatuses = ["CREATED", "PROCESSING", "VERIFIED", "FAILED", "REFUNDED"];
        if (validPaymentStatuses.includes(normalized)) {
          req.query.payment_status = normalized;
        }
      }
    }

    if (req.body.payment_status !== undefined && req.body.payment_status !== null) {
      const normalized = String(req.body.payment_status).toUpperCase().trim();
      const validPaymentStatuses = ["CREATED", "PROCESSING", "VERIFIED", "FAILED", "REFUNDED"];
      if (validPaymentStatuses.includes(normalized)) {
        req.body.payment_status = normalized;
      }
    }
  }

  next();
}

module.exports = {
  normalizeEnums,
};

