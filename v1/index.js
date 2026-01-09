const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config();

const v1Routes = require("./routes");
const initSocket = require("./socket");

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Get allowed origins from environment or use defaults
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:5173",
          "http://localhost:8080",
          "http://localhost:8081",
        ];

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow local network IPs (for development/testing)
    const localNetworkPatterns = [
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // 192.168.x.x
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/, // 10.x.x.x
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/, // 172.16-31.x.x
    ];

    for (const pattern of localNetworkPatterns) {
      if (pattern.test(origin)) {
        return callback(null, true);
      }
    }

    // Block origin if not allowed
    console.log("CORS blocked origin:", origin);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Stoory Backend v1 is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  });
});

// Mount API routes
app.use("/api/v1", v1Routes);

// Initialize Socket.IO
const io = initSocket(server);

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = {
  app,
  server,
  io,
};
