// Normalize enum values in request body and query parameters to uppercase
function normalizeEnums(req, res, next) {
  // Normalize enum value helper function
  const normalizeEnum = (value, validValues) => {
    if (value === undefined || value === null) return null;
    const normalized = String(value).toUpperCase().trim();
    return validValues.includes(normalized) ? normalized : null;
  };

  // Normalize request body enums
  if (req.body) {
    // Gender enum
    if (req.body.gender !== undefined && req.body.gender !== null) {
      const normalized = normalizeEnum(req.body.gender, ["MALE", "FEMALE", "OTHER"]);
      if (normalized) req.body.gender = normalized;
    }

    // Tier enum (for influencer tier)
    if (req.body.tier !== undefined && req.body.tier !== null) {
      const normalized = normalizeEnum(req.body.tier, ["NANO", "MICRO", "MID", "MACRO"]);
      if (normalized) req.body.tier = normalized;
    }

    if (req.body.influencer_tier !== undefined && req.body.influencer_tier !== null) {
      const normalized = normalizeEnum(req.body.influencer_tier, [
        "NANO",
        "MICRO",
        "MID",
        "MACRO",
      ]);
      if (normalized) req.body.influencer_tier = normalized;
    }

    // Campaign type enum
    if (req.body.type !== undefined && req.body.type !== null) {
      const normalized = normalizeEnum(req.body.type, ["NORMAL", "BULK"]);
      if (normalized) req.body.type = normalized;
    }

    // Status enum (campaign status)
    if (req.body.status !== undefined && req.body.status !== null) {
      const normalized = normalizeEnum(req.body.status, [
        "DRAFT",
        "LIVE",
        "LOCKED",
        "ACTIVE",
        "COMPLETED",
        "EXPIRED",
        "CANCELLED",
      ]);
      if (normalized) req.body.status = normalized;
    }

    // Billing cycle enum
    if (req.body.billing_cycle !== undefined && req.body.billing_cycle !== null) {
      const normalized = normalizeEnum(req.body.billing_cycle, ["MONTHLY", "YEARLY"]);
      if (normalized) req.body.billing_cycle = normalized;
    }

    // Application phase enum
    if (req.body.phase !== undefined && req.body.phase !== null) {
      const normalized = normalizeEnum(req.body.phase, [
        "APPLIED",
        "ACCEPTED",
        "SCRIPT",
        "WORK",
        "COMPLETED",
        "CANCELLED",
      ]);
      if (normalized) req.body.phase = normalized;
    }

    // Submission status enum (overrides campaign status if present)
    if (req.body.status !== undefined && req.body.status !== null) {
      const normalized = normalizeEnum(req.body.status, [
        "PENDING",
        "ACCEPTED",
        "REVISION",
        "REJECTED",
      ]);
      if (normalized) req.body.status = normalized;
    }

    // Entity type enum
    if (req.body.entity_type !== undefined && req.body.entity_type !== null) {
      const normalized = normalizeEnum(req.body.entity_type, ["SCRIPT", "WORK"]);
      if (normalized) req.body.entity_type = normalized;
    }

    // Rejection role enum
    if (
      req.body.rejected_by_role !== undefined &&
      req.body.rejected_by_role !== null
    ) {
      const normalized = normalizeEnum(req.body.rejected_by_role, ["BRAND", "ADMIN"]);
      if (normalized) req.body.rejected_by_role = normalized;
    }

    // User role enum
    if (req.body.role !== undefined && req.body.role !== null) {
      const normalized = normalizeEnum(req.body.role, [
        "BRAND_OWNER",
        "INFLUENCER",
        "ADMIN",
      ]);
      if (normalized) req.body.role = normalized;
    }

    // Payment status enum
    if (req.body.payment_status !== undefined && req.body.payment_status !== null) {
      const normalized = normalizeEnum(req.body.payment_status, [
        "CREATED",
        "PROCESSING",
        "VERIFIED",
        "FAILED",
        "REFUNDED",
      ]);
      if (normalized) req.body.payment_status = normalized;
    }

    // Social platforms array normalization
    if (Array.isArray(req.body.social_platforms)) {
      req.body.social_platforms = req.body.social_platforms.map((platform) => {
        const normalized = { ...platform };

        // Normalize platform name (handles multiple field name variations)
        if (
          normalized.platform_name ||
          normalized.platform ||
          normalized.platformName
        ) {
          const platformName =
            normalized.platform_name ||
            normalized.platform ||
            normalized.platformName;
          const normalizedPlatform = normalizeEnum(platformName, [
            "INSTAGRAM",
            "FACEBOOK",
            "YOUTUBE",
          ]);
          if (normalizedPlatform) {
            normalized.platform_name = normalizedPlatform;
            normalized.platform = normalizedPlatform;
            normalized.platformName = normalizedPlatform;
          }
        }

        // Normalize data source
        if (
          normalized.data_source !== undefined &&
          normalized.data_source !== null
        ) {
          const normalizedDataSource = normalizeEnum(normalized.data_source, [
            "MANUAL",
            "GRAPH_API",
          ]);
          if (normalizedDataSource) {
            normalized.data_source = normalizedDataSource;
          }
        }

        return normalized;
      });
    }
  }

  // Normalize query parameter enums
  if (req.query) {
    // Campaign status
    if (req.query.status !== undefined && req.query.status !== null) {
      const normalized = normalizeEnum(req.query.status, [
        "DRAFT",
        "LIVE",
        "LOCKED",
        "ACTIVE",
        "COMPLETED",
        "EXPIRED",
        "CANCELLED",
      ]);
      if (normalized) req.query.status = normalized;
    }

    // Campaign type
    if (req.query.type !== undefined && req.query.type !== null) {
      const normalized = normalizeEnum(req.query.type, ["NORMAL", "BULK"]);
      if (normalized) req.query.type = normalized;
    }

    // Application phase
    if (req.query.phase !== undefined && req.query.phase !== null) {
      const normalized = normalizeEnum(req.query.phase, [
        "APPLIED",
        "ACCEPTED",
        "SCRIPT",
        "WORK",
        "COMPLETED",
        "CANCELLED",
      ]);
      if (normalized) req.query.phase = normalized;
    }

    // Submission status (overrides campaign status if present)
    if (req.query.status !== undefined && req.query.status !== null) {
      const normalized = normalizeEnum(req.query.status, [
        "PENDING",
        "ACCEPTED",
        "REVISION",
        "REJECTED",
      ]);
      if (normalized) req.query.status = normalized;
    }

    // Payout status
    if (
      req.query.payout_status !== undefined &&
      req.query.payout_status !== null
    ) {
      const normalized = normalizeEnum(req.query.payout_status, [
        "PENDING",
        "RELEASED",
        "FAILED",
      ]);
      if (normalized) req.query.payout_status = normalized;
    }

    // Payment status
    if (
      req.query.payment_status !== undefined &&
      req.query.payment_status !== null
    ) {
      const normalized = normalizeEnum(req.query.payment_status, [
        "CREATED",
        "PROCESSING",
        "VERIFIED",
        "FAILED",
        "REFUNDED",
      ]);
      if (normalized) req.query.payment_status = normalized;
    }
  }

  next();
}

module.exports = {
  normalizeEnums,
};
