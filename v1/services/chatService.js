const { supabaseAdmin } = require("../db/config");
const { maskContent } = require("../utils/contentSafety");

const ChatService = {
  // Create a new chat for an application (requires verified payment)
  async createChat(applicationId) {
    if (!applicationId) {
      throw new Error("applicationId is required");
    }

    // Verify payment is completed before allowing chat
    const { data: paymentOrder } = await supabaseAdmin
      .from("v1_payment_orders")
      .select("status")
      .eq("application_id", applicationId)
      .eq("status", "VERIFIED")
      .maybeSingle();

    if (!paymentOrder) {
      throw new Error(
        "Payment must be verified before chat can be created"
      );
    }

    // Check if chat already exists
    const { data: existingChat } = await supabaseAdmin
      .from("v1_chats")
      .select("id, status, application_id")
      .eq("application_id", applicationId)
      .maybeSingle();

    if (existingChat) {
      return existingChat;
    }

    // Create new chat
    const { data, error } = await supabaseAdmin
      .from("v1_chats")
      .insert({
        application_id: applicationId,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (error) {
      // Handle race condition (multiple simultaneous requests)
      if (
        error.code === "23505" ||
        error.message?.includes("duplicate") ||
        error.message?.includes("unique")
      ) {
        const { data: raceConditionChat } = await supabaseAdmin
          .from("v1_chats")
          .select("id, status, application_id")
          .eq("application_id", applicationId)
          .maybeSingle();

        if (raceConditionChat) {
          return raceConditionChat;
        }
      }

      console.error("Error creating chat:", error);
      throw new Error(`Failed to create chat: ${error.message}`);
    }

    return data;
  },

  // Validate user has access to application chat
  async validateUserAccess(userId, applicationId) {
    if (!userId || !applicationId) {
      return false;
    }

    try {
      const { data: application, error } = await supabaseAdmin
        .from("v1_applications")
        .select("influencer_id, v1_campaigns!inner(brand_id)")
        .eq("id", applicationId)
        .single();

      if (error || !application) {
        console.error("Error validating access:", error);
        return false;
      }

      const isInfluencer = application.influencer_id === userId;
      const isBrandOwner = application.v1_campaigns?.brand_id === userId;

      return isInfluencer || isBrandOwner;
    } catch (error) {
      console.error("Error in validateUserAccess:", error);
      return false;
    }
  },

  // Get chat by application ID
  async getChatByApplication(applicationId) {
    if (!applicationId) {
      return null;
    }

    const { data: chat, error } = await supabaseAdmin
      .from("v1_chats")
      .select("id, status, application_id")
      .eq("application_id", applicationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      if (error.message?.includes("More than one row")) {
        console.error(
          `Data integrity issue: Multiple chats found for application ${applicationId}`
        );
        throw new Error(
          "Multiple chats found for this application. Please contact support."
        );
      }
      console.error("Error getting chat:", error);
      throw new Error(`Failed to get chat: ${error.message}`);
    }

    return chat;
  },

  // Save a message to chat
  async saveMessage(
    userId,
    applicationId,
    messageContent,
    attachmentUrl = null
  ) {
    if (!userId || !applicationId) {
      throw new Error("userId and applicationId are required");
    }

    if (!messageContent || typeof messageContent !== "string") {
      throw new Error("messageContent must be a non-empty string");
    }

    if (messageContent.trim().length === 0) {
      throw new Error("messageContent cannot be empty");
    }

    // Get chat for application
    const { data: chat, error: chatError } = await supabaseAdmin
      .from("v1_chats")
      .select("id, status, applications(phase)")
      .eq("application_id", applicationId)
      .single();

    if (chatError) {
      if (
        chatError.code === "PGRST116" ||
        chatError.message?.includes("More than one row")
      ) {
        console.error(
          `Data integrity issue: Multiple chats found for application ${applicationId}`
        );
        throw new Error(
          "Multiple chats found for this application. Please contact support."
        );
      }
      throw new Error(
        `Chat not found for this application: ${chatError.message}`
      );
    }

    if (!chat) {
      throw new Error("Chat not found for this application");
    }

    if (chat.status !== "ACTIVE") {
      throw new Error("Chat is CLOSED. Messaging is not allowed.");
    }

    // Verify user access
    const hasAccess = await this.validateUserAccess(userId, applicationId);
    if (!hasAccess) {
      throw new Error("You don't have access to this chat");
    }

    // Mask sensitive content before saving
    const safeMessage = maskContent(messageContent);

    const { data: savedMessage, error: saveError } = await supabaseAdmin
      .from("v1_chat_messages")
      .insert({
        chat_id: chat.id,
        sender_id: userId,
        message: safeMessage,
        attachment_url: attachmentUrl,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving message:", saveError);
      throw new Error(`Failed to save message: ${saveError.message}`);
    }

    return savedMessage;
  },

  // Get chat history for an application (paginated)
  async getChatHistory(applicationId, limit = 50, offset = 0) {
    if (!applicationId) {
      throw new Error("applicationId is required");
    }

    if (limit > 100) {
      limit = 100;
    }

    const { data: chat, error: chatError } = await supabaseAdmin
      .from("v1_chats")
      .select("id")
      .eq("application_id", applicationId)
      .maybeSingle();

    if (chatError) {
      console.error("Error getting chat in getChatHistory:", chatError);
      throw new Error(`Failed to get chat: ${chatError.message}`);
    }

    if (!chat) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from("v1_chat_messages")
      .select("*")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error getting chat history:", error);
      throw new Error(`Failed to get chat history: ${error.message}`);
    }

    return data || [];
  },

  // Close chat for an application
  async closeChat(applicationId) {
    if (!applicationId) {
      throw new Error("applicationId is required");
    }

    const { error } = await supabaseAdmin
      .from("v1_chats")
      .update({ status: "CLOSED" })
      .eq("application_id", applicationId);

    if (error) {
      console.error("Error closing chat:", error);
      throw new Error(`Failed to close chat: ${error.message}`);
    }
  },

  // Mark a message as read by a user
  async markMessageAsRead(messageId, userId) {
    if (!messageId || !userId) {
      throw new Error("messageId and userId are required");
    }

    const { data: message, error: messageError } = await supabaseAdmin
      .from("v1_chat_messages")
      .select("id, chat_id, sender_id, v1_chats!inner(application_id)")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      throw new Error("Message not found");
    }

    if (message.sender_id === userId) {
      return { success: true, message: "Cannot mark own message as read" };
    }

    // Verify user has access to this message
    const hasAccess = await this.validateUserAccess(
      userId,
      message.v1_chats.application_id
    );
    if (!hasAccess) {
      throw new Error("You do not have access to this message");
    }

    const { data: readReceipt, error: readError } = await supabaseAdmin
      .from("v1_chat_message_reads")
      .upsert(
        {
          message_id: messageId,
          user_id: userId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: "message_id,user_id",
        }
      )
      .select()
      .single();

    if (readError) {
      console.error("Error marking message as read:", readError);
      throw new Error(`Failed to mark message as read: ${readError.message}`);
    }

    return readReceipt;
  },

  // Get read receipts for a message
  async getReadReceipts(messageId) {
    if (!messageId) {
      throw new Error("messageId is required");
    }

    const { data: readReceipts, error } = await supabaseAdmin
      .from("v1_chat_message_reads")
      .select("*")
      .eq("message_id", messageId)
      .order("read_at", { ascending: false });

    if (error) {
      console.error("Error getting read receipts:", error);
      throw new Error(`Failed to get read receipts: ${error.message}`);
    }

    return readReceipts || [];
  },
};

module.exports = ChatService;
