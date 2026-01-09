const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth");
const profileRoutes = require("./profile");
const campaignRoutes = require("./campaigns");
const applicationRoutes = require("./applications");
const chatRoutes = require("./chat");
const userRoutes = require("./users");
const planRoutes = require("./plans");
const paymentRoutes = require("./payments");
const subscriptionRoutes = require("./subscriptions");
const submissionRoutes = require("./submissions");
const mouRoutes = require("./mous");
const adminSettingsRoutes = require("./adminSettings");

// Mount route modules
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/applications", applicationRoutes);
router.use("/chat", chatRoutes);
router.use("/users", userRoutes);
router.use("/plans", planRoutes);
router.use("/payments", paymentRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/submissions", submissionRoutes);
router.use("/mous", mouRoutes);
router.use("/admin/settings", adminSettingsRoutes);

module.exports = router;
