const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const { ChatService } = require("../services");
const { supabaseAdmin } = require("../db/config");

// Rate limiting configuration
const messageRateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 30;

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, limits] of messageRateLimits.entries()) {
    if (now > limits.resetTime) {
      messageRateLimits.delete(userId);
    }
  }
}, RATE_LIMIT_WINDOW * 2);

// Initialize Socket.IO server
const initSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || [
        "http://localhost:3000",
        "http://localhost:5173",
      ],
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Authorization", "Content-Type"],
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8,
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      console.error("Socket auth error:", err.message);
      if (err.name === "TokenExpiredError") {
        return next(new Error("Token expired"));
      }
      next(new Error("Invalid token"));
    }
  });

  // Handle socket connections
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    socket.currentRoom = null;
    socket.userId = socket.user.id;

    // Join chat room for an application
    socket.on("join_chat", async ({ applicationId }) => {
      try {
        if (!applicationId) {
          return socket.emit("error", {
            message: "applicationId is required",
          });
        }

        // Verify user has access to application
        const hasAccess = await ChatService.validateUserAccess(
          socket.user.id,
          applicationId
        );

        if (!hasAccess) {
          return socket.emit("error", {
            message: "Access denied to this application",
          });
        }

        // Get chat for application
        const chat = await ChatService.getChatByApplication(applicationId);
        if (!chat) {
          return socket.emit("error", {
            message: "Chat not found for this application",
          });
        }

        if (chat.status !== "ACTIVE") {
          return socket.emit("error", {
            message: "Chat is closed",
          });
        }

        const roomName = `app_${applicationId}`;

        // Leave previous room if any
        if (socket.currentRoom) {
          socket.leave(socket.currentRoom);
        }

        socket.join(roomName);
        socket.currentRoom = roomName;

        console.log(`User ${socket.user.id} joined room ${roomName}`);

        // Notify other users in room
        socket.to(roomName).emit("user_joined", {
          userId: socket.user.id,
          applicationId,
          timestamp: new Date().toISOString(),
        });

        // Confirm join to user
        socket.emit("joined_chat", {
          applicationId,
          roomName,
        });
      } catch (error) {
        console.error("Join chat error:", error);
        socket.emit("error", {
          message: error.message || "Failed to join chat",
        });
      }
    });

    // Send message in chat
    socket.on("send_message", async (payload, callback) => {
      try {
        const { applicationId, message, attachmentUrl } = payload;

        if (!applicationId) {
          return socket.emit("error", {
            message: "applicationId is required",
          });
        }

        if (!message || typeof message !== "string" || !message.trim()) {
          return socket.emit("error", {
            message: "message is required and must be a non-empty string",
          });
        }

        if (message.length > 10000) {
          return socket.emit("error", {
            message: "Message exceeds maximum length of 10000 characters",
          });
        }

        // Rate limiting check
        const now = Date.now();
        const userLimits =
          messageRateLimits.get(socket.userId) || {
            count: 0,
            resetTime: now + RATE_LIMIT_WINDOW,
          };

        if (now > userLimits.resetTime) {
          userLimits.count = 0;
          userLimits.resetTime = now + RATE_LIMIT_WINDOW;
        }

        if (userLimits.count >= MAX_MESSAGES_PER_WINDOW) {
          return socket.emit("error", {
            message:
              "Rate limit exceeded. Please wait before sending more messages.",
          });
        }

        userLimits.count++;
        messageRateLimits.set(socket.userId, userLimits);

        // Verify user is in the chat room
        if (!socket.rooms.has(`app_${applicationId}`)) {
          return socket.emit("error", {
            message: "You must join the chat room first",
          });
        }

        // Save message to database
        const savedMessage = await ChatService.saveMessage(
          socket.user.id,
          applicationId,
          message,
          attachmentUrl
        );

        // Broadcast message to all users in room
        io.to(`app_${applicationId}`).emit("receive_message", {
          ...savedMessage,
          sender: {
            id: socket.user.id,
          },
        });

        if (callback) {
          callback({
            success: true,
            messageId: savedMessage.id,
            timestamp: savedMessage.created_at,
          });
        }
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", {
          message: error.message || "Failed to send message",
        });
        if (callback) {
          callback({
            success: false,
            error: error.message,
          });
        }
      }
    });

    // Handle typing indicator
    socket.on("typing", ({ applicationId, isTyping }) => {
      if (!applicationId) {
        return;
      }

      if (
        socket.currentRoom &&
        socket.currentRoom === `app_${applicationId}`
      ) {
        socket.to(socket.currentRoom).emit("user_typing", {
          userId: socket.user.id,
          isTyping: Boolean(isTyping),
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Mark message as read
    socket.on("mark_read", async ({ messageId }, callback) => {
      try {
        if (!messageId) {
          return socket.emit("error", {
            message: "messageId is required",
          });
        }

        // Get message with chat info
        const { data: message, error: messageError } = await supabaseAdmin
          .from("v1_chat_messages")
          .select("chat_id, v1_chats(application_id)")
          .eq("id", messageId)
          .single();

        if (messageError || !message) {
          return socket.emit("error", {
            message: "Message not found",
          });
        }

        // Mark message as read
        const readReceipt = await ChatService.markMessageAsRead(
          messageId,
          socket.user.id
        );

        // Broadcast read receipt to room
        if (message.v1_chats && message.v1_chats.application_id) {
          const applicationId = message.v1_chats.application_id;
          const roomName = `app_${applicationId}`;

          io.to(roomName).emit("message_read", {
            messageId,
            userId: socket.user.id,
            readAt: readReceipt.read_at || new Date().toISOString(),
            timestamp: new Date().toISOString(),
          });
        }

        if (callback) {
          callback({
            success: true,
            readReceipt,
          });
        }
      } catch (error) {
        console.error("Mark read error:", error);
        socket.emit("error", {
          message: error.message || "Failed to mark message as read",
        });
        if (callback) {
          callback({
            success: false,
            error: error.message,
          });
        }
      }
    });

    // Leave chat room
    socket.on("leave_chat", () => {
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit("user_left", {
          userId: socket.user.id,
          timestamp: new Date().toISOString(),
        });
        socket.leave(socket.currentRoom);
        socket.currentRoom = null;
      }
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`User ${socket.user.id} disconnected: ${reason}`);

      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit("user_left", {
          userId: socket.user.id,
          timestamp: new Date().toISOString(),
        });
      }

      // Clean up rate limiting data
      messageRateLimits.delete(socket.userId);
    });
  });

  return io;
};

module.exports = initSocket;
