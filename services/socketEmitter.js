/**
 * Simple singleton Socket.IO emitter service
 * Provides helpers to emit events to conversations, campaigns, and users
 */
class SocketEmitter {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize with Socket.IO instance
   */
  setIO(io) {
    this.io = io;
  }

  /**
   * Emit to all clients in a conversation room
   */
  emitToConversation(conversationId, event, data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized, skipping emit:', event);
      return;
    }
    this.io.to(`room:${conversationId}`).emit(event, data);
  }

  /**
   * Emit to all clients in a campaign work room
   */
  emitToCampaign(campaignId, event, data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized, skipping emit:', event);
      return;
    }
    this.io.to(`room:work:${campaignId}`).emit(event, data);
  }

  /**
   * Emit to all sockets of a specific user
   */
  emitToUser(userId, event, data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized, skipping emit:', event);
      return;
    }
    this.io.to(`user_${userId}`).emit(event, data);
  }

  /**
   * Emit to a specific socket
   */
  emitToSocket(socketId, event, data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized, skipping emit:', event);
      return;
    }
    this.io.to(socketId).emit(event, data);
  }
}

// Export singleton instance
const socketEmitter = new SocketEmitter();
module.exports = socketEmitter;

