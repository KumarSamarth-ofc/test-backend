const express = require("express");
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const router = express.Router();

const v1Routes = require("./routes");
router.use("/", v1Routes);

const initSocket = require('./socket');

const app = express();
const server = http.createServer(app);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        const allowedOrigins = process.env.CORS_ORIGIN 
            ? process.env.CORS_ORIGIN.split(',')
            : [
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:5173',
                'http://localhost:8080',
                'http://localhost:8081',
            ];
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        const localNetworkPatterns = [
            /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
            /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
            /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/
        ];
        
        for (const pattern of localNetworkPatterns) {
            if (pattern.test(origin)) {
                return callback(null, true);
            }
        }
        
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Stoory Backend v1 is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0"
  });
});


app.use("/api/v1", router);

const io = initSocket(server);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = {
  app,
  server,
  io,
  router
};