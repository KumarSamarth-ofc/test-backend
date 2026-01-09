const express = require("express");
const router = express.Router();


const authRoutes = require("./auth");
router.use("/auth", authRoutes);

const profileRoutes = require("./profile");
router.use("/profile", profileRoutes);

const campaignRoutes = require("./campaigns");
router.use("/campaigns", campaignRoutes);

const applicationRoutes = require('./applications');
router.use('/applications', applicationRoutes);

const chatRoutes = require('./chat');
router.use('/chat', chatRoutes);

const userRoutes = require('./users');
router.use('/users', userRoutes);

const planRoutes = require('./plans');
router.use('/plans', planRoutes);

const paymentRoutes = require('./payments');
router.use('/payments', paymentRoutes);

const subscriptionRoutes = require('./subscriptions');
router.use('/subscriptions', subscriptionRoutes);

const submissionRoutes = require('./submissions');
router.use('/submissions', submissionRoutes);

const mouRoutes = require('./mous');
router.use('/mous', mouRoutes);

const adminSettingsRoutes = require('./adminSettings');
router.use('/admin/settings', adminSettingsRoutes);

module.exports = router;
