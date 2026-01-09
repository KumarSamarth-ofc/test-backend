const jwt = require("jsonwebtoken");
const { supabaseAdmin } = require("../db/config");

class AuthMiddleware {
  constructor() {
    this.jwtSecret =
      process.env.JWT_SECRET || "your-secret-key-change-in-production";
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return { success: true, user: decoded };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const result = this.verifyToken(token);
    if (!result.success) {
      console.log("⛔ [AUTH] Token verification failed:", result.message);
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = result.user;
    next();
  };

  authenticateTokenOptional = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      req.user = undefined;
      return next();
    }

    const result = this.verifyToken(token);
    if (!result.success) {
      req.user = undefined;
      return next();
    }

    req.user = result.user;
    next();
  };

  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      next();
    };
  }
}

module.exports = new AuthMiddleware();
