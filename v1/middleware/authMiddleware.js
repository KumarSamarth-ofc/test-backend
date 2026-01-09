const jwt = require("jsonwebtoken");

class AuthMiddleware {
  constructor() {
    // JWT secret key from environment or default (should be changed in production)
    this.jwtSecret =
      process.env.JWT_SECRET || "your-secret-key-change-in-production";
  }

  // Verify and decode JWT token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return { success: true, user: decoded };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Extract token from Authorization header
  extractToken(authHeader) {
    return authHeader && authHeader.split(" ")[1];
  }

  // Middleware: Require authentication token
  authenticateToken = (req, res, next) => {
    const token = this.extractToken(req.headers["authorization"]);

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

  // Middleware: Optional authentication (doesn't fail if token is missing or invalid)
  authenticateTokenOptional = (req, res, next) => {
    const token = this.extractToken(req.headers["authorization"]);

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

  // Middleware factory: Require specific role(s)
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
