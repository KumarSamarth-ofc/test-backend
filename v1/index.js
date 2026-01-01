const express = require("express");

// Root router for all /api/v1 APIs
const router = express.Router();

// Mount all v1 routes
const v1Routes = require("./routes");
router.use("/", v1Routes); // → /api/v1/*

module.exports = router;

