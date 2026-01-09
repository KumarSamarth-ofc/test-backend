const { ChatService } = require("../services");

class ChatController {
  // Validate user access to application
  async validateAccess(userId, applicationId, res) {
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "applicationId is required",
      });
    }

    const hasAccess = await ChatService.validateUserAccess(userId, applicationId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this application",
      });
    }

    return null; // Access granted
  }

  // Get chat history for an application
  async getHistory(req, res) {
    try {
      const { applicationId } = req.params;
      const userId = req.user.id;

      const accessError = await this.validateAccess(userId, applicationId, res);
      if (accessError) return;

      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const offset = parseInt(req.query.offset) || 0;

      const messages = await ChatService.getChatHistory(
        applicationId,
        limit,
        offset
      );

      res.json({
        success: true,
        data: messages,
        pagination: {
          limit,
          offset,
          count: messages.length,
        },
      });
    } catch (error) {
      console.error("[ChatController/getHistory] Exception:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get chat history",
      });
    }
  }

  // Create a new chat for an application
  async createChat(req, res) {
    try {
      const { applicationId } = req.params;
      const userId = req.user.id;

      const accessError = await this.validateAccess(userId, applicationId, res);
      if (accessError) return;

      const chat = await ChatService.createChat(applicationId);

      res.status(201).json({
        success: true,
        data: chat,
        message: "Chat created successfully",
      });
    } catch (error) {
      console.error("[ChatController/createChat] Exception:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create chat",
      });
    }
  }

  // Get chat details for an application
  async getChat(req, res) {
    try {
      const { applicationId } = req.params;
      const userId = req.user.id;

      const accessError = await this.validateAccess(userId, applicationId, res);
      if (accessError) return;

      const chat = await ChatService.getChatByApplication(applicationId);

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found for this application",
        });
      }

      res.json({
        success: true,
        data: chat,
      });
    } catch (error) {
      console.error("[ChatController/getChat] Exception:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get chat",
      });
    }
  }
}

module.exports = new ChatController();
