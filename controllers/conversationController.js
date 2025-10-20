const { supabaseAdmin } = require("../supabase/client");
const adminPaymentFlowService = require("../utils/adminPaymentFlowService");

// Small helper to emit via Socket.IO
function getIO(req) {
  try {
    return req.app && req.app.get("io");
  } catch (_) {
    return null;
  }
}

// Fetch conversation and participants
async function fetchConversation(conversationId) {
  const { data: conv, error } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();
  if (error || !conv) throw new Error("Conversation not found");
  return conv;
}

// Determine agreed amount (final_agreed_amount from related request if available, else flow_data.agreed_amount)
async function resolveAgreedAmount(conversation) {
  // Try request by bid/campaign pair
  if (conversation.bid_id || conversation.campaign_id) {
    const { data: reqByPair } = await supabaseAdmin
      .from("requests")
      .select("id, final_agreed_amount")
      .eq("influencer_id", conversation.influencer_id)
      .eq(conversation.bid_id ? "bid_id" : "campaign_id", conversation.bid_id || conversation.campaign_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (reqByPair && reqByPair.final_agreed_amount) {
      return parseFloat(reqByPair.final_agreed_amount);
    }
  }
  // Fallback to conversation.flow_data.agreed_amount
  if (conversation.flow_data && conversation.flow_data.agreed_amount) {
    const amt = parseFloat(conversation.flow_data.agreed_amount);
    if (!isNaN(amt) && amt > 0) return amt;
  }
  return null;
}

async function getPaymentBreakdownForConversation(conversation) {
  const agreedAmount = await resolveAgreedAmount(conversation);
  if (!agreedAmount) return null;
  const breakdown = await adminPaymentFlowService.calculatePaymentBreakdown(agreedAmount);
  // Normalize with rupees for convenience
  return {
    commission_percentage: breakdown.commission_percentage,
    total_amount: breakdown.total_amount_paise / 100,
    commission_amount: breakdown.commission_amount_paise / 100,
    net_amount: breakdown.net_amount_paise / 100,
    advance_amount: breakdown.advance_amount_paise / 100,
    final_amount: breakdown.final_amount_paise / 100,
  };
}

// Insert automated message with optional attachments
async function createAutomatedMessage({ conversationId, senderId, receiverId, text, attachments }) {
  const messagePayload = {
    conversation_id: conversationId,
    sender_id: senderId || null,
    receiver_id: receiverId || null,
    message: text,
    message_type: "system",
  };
  if (attachments && attachments.length > 0) {
    messagePayload.attachment_metadata = { attachments };
  }
  const { data: msg, error } = await supabaseAdmin
    .from("messages")
    .insert(messagePayload)
    .select()
    .single();
  if (error) throw new Error(`Failed to create message: ${error.message}`);
  return msg;
}

// Basic state transition guard logic
function canTransition(from, action) {
  const table = {
    submit_work: ["work_in_progress", "work_revision_requested"],
    request_revision: ["work_submitted"],
    approve_work: ["work_submitted"],
    close: ["work_approved"],
  };
  const allowed = table[action] || [];
  return allowed.includes(from);
}

async function updateConversationState(conversationId, fromState, toState, awaitingRole) {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .update({ flow_state: toState, awaiting_role: awaitingRole || null, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update state: ${error.message}`);
  return data;
}

class ConversationController {
  async getConversation(req, res) {
    try {
      const { id } = req.params;
      const conv = await fetchConversation(id);
      const payment_breakdown = await getPaymentBreakdownForConversation(conv);
      return res.json({ success: true, conversation: conv, payment_breakdown });
    } catch (error) {
      return res.status(404).json({ success: false, error: error.message });
    }
  }

  // POST /api/conversations/:id/actions
  async performAction(req, res) {
    try {
      const { id } = req.params;
      const { action, payload = {} } = req.body || {};
      const userId = req.user.id;

      if (!action) {
        return res.status(400).json({ success: false, error: "action is required" });
      }

      const conv = await fetchConversation(id);

      // Role guards for all actions
      if (action === "submit_work" && req.user.role !== "influencer") {
        return res.status(403).json({ success: false, error: "Only influencer can submit work" });
      }
      if ((action === "request_revision" || action === "approve_work") && req.user.role !== "brand_owner") {
        return res.status(403).json({ success: false, error: "Only brand owner can perform this action" });
      }
      if ((action === "accept_price" || action === "reject_price" || action === "negotiate_price") && req.user.role !== "brand_owner") {
        return res.status(403).json({ success: false, error: "Only brand owner can perform this action" });
      }

      // State guards
      if (!canTransition(conv.flow_state, action)) {
        return res.status(409).json({ success: false, error: `Invalid state transition from ${conv.flow_state} via ${action}` });
      }

      const io = getIO(req);
      let newState = conv.flow_state;
      let awaitingRole = conv.awaiting_role;
      let createdMessage = null;

      if (action === "submit_work") {
        // Create work submission message (attachments optional)
        createdMessage = await createAutomatedMessage({
          conversationId: id,
          senderId: userId,
          receiverId: conv.brand_owner_id,
          text: payload.message || "Work submitted",
          attachments: payload.attachments || [],
        });
        newState = "work_submitted";
        awaitingRole = "brand_owner";
      }

      if (action === "request_revision") {
        createdMessage = await createAutomatedMessage({
          conversationId: id,
          senderId: userId,
          receiverId: conv.influencer_id,
          text: payload.reason || "Revision requested",
          attachments: payload.attachments || [],
        });
        newState = "work_revision_requested";
        awaitingRole = "influencer";
      }

      if (action === "approve_work") {
        createdMessage = await createAutomatedMessage({
          conversationId: id,
          senderId: userId,
          receiverId: conv.influencer_id,
          text: payload.note || "Work approved by brand owner",
          attachments: payload.attachments || [],
        });
        newState = "work_approved";
        awaitingRole = null;
      }

      if (action === "close") {
        createdMessage = await createAutomatedMessage({
          conversationId: id,
          senderId: userId,
          receiverId: null,
          text: payload.note || "Conversation closed",
        });
        newState = "closed";
        awaitingRole = null;
      }

      const updatedConv = await updateConversationState(id, conv.flow_state, newState, awaitingRole);

      // Emits
      if (io) {
        io.to(`conversation_${id}`).emit("conversation_state_changed", {
          conversation_id: id,
          previous_state: conv.flow_state,
          new_state: newState,
          reason: action,
          timestamp: new Date().toISOString(),
        });
        if (createdMessage) {
          io.to(`conversation_${id}`).emit("new_message", {
            conversation_id: id,
            message: createdMessage,
            conversation_context: {
              id: id,
              flow_state: newState,
              awaiting_role: awaitingRole,
              chat_status: 'automated'
            }
          });
        }
      }

      // Return standardized response format (matching BidController and CampaignController)
      return res.json({
        success: true,
        conversation: updatedConv,
        message: createdMessage,
        audit_message: null, // ConversationController doesn't create audit messages
        flow_state: updatedConv.flow_state,
        awaiting_role: updatedConv.awaiting_role
      });
    } catch (error) {
      console.error("performAction error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Admin payment endpoints (receive, release advance, release final, refund final)
  async receivePayment(req, res) {
    try {
      const { id } = req.params;
      const { amount, currency = "INR", reference, attachments = [], notes, commission_percent } = req.body || {};
      if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
      if (!amount || amount <= 0) return res.status(400).json({ success: false, error: "Valid amount required" });

      const conv = await fetchConversation(id);

      // Track brand owner payment to admin (for audit). We do not alter state here.
      const payload = {
        conversation_id: id,
        direction: "in",
        type: "credit",
        status: "completed",
        amount: amount,
        amount_paise: Math.round(Number(amount) * 100),
        notes: notes || `Payment received for conversation ${id}`,
        payment_stage: "received",
        admin_payment_tracking_id: reference || null,
      };

      const { data: txn, error: txnErr } = await supabaseAdmin
        .from("transactions")
        .insert(payload)
        .select()
        .single();
      if (txnErr) return res.status(500).json({ success: false, error: txnErr.message });

      // Automated message with optional screenshot
      const msg = await createAutomatedMessage({
        conversationId: id,
        senderId: req.user.id,
        receiverId: null,
        text: `Admin recorded payment from brand owner: ₹${amount}${commission_percent ? ` (commission ${commission_percent}%)` : ""}`,
        attachments,
      });

      const io = getIO(req);
      if (io) {
        io.to(`conversation_${id}`).emit("new_message", { conversation_id: id, message: msg });
      }

      const payment_breakdown = await getPaymentBreakdownForConversation(conv);
      return res.json({ success: true, transaction: txn, message: msg, payment_breakdown });
    } catch (error) {
      console.error("receivePayment error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async releaseAdvance(req, res) {
    try {
      const { id } = req.params;
      const { amount, currency = "INR", payout_reference, attachments = [], notes, commission_percent } = req.body || {};
      if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
      if (!amount || amount <= 0) return res.status(400).json({ success: false, error: "Valid amount required" });

      const conv = await fetchConversation(id);

      // Record payout to influencer
      const payout = {
        conversation_id: id,
        direction: "out",
        type: "debit",
        status: "completed",
        amount: amount,
        amount_paise: Math.round(Number(amount) * 100),
        notes: notes || `Advance released to influencer for conversation ${id}`,
        payment_stage: "advance",
        admin_payment_tracking_id: payout_reference || null,
        receiver_id: conv.influencer_id,
        sender_id: req.user.id,
      };
      const { data: txn, error: txnErr } = await supabaseAdmin
        .from("transactions")
        .insert(payout)
        .select()
        .single();
      if (txnErr) return res.status(500).json({ success: false, error: txnErr.message });

      // Move state to work_in_progress
      const updatedConv = await updateConversationState(id, conv.flow_state, "work_in_progress", "influencer");

      const msg = await createAutomatedMessage({
        conversationId: id,
        senderId: req.user.id,
        receiverId: conv.influencer_id,
        text: `Admin released advance ₹${amount}${commission_percent ? ` (commission ${commission_percent}%)` : ""}`,
        attachments,
      });

      const io = getIO(req);
      if (io) {
        io.to(`conversation_${id}`).emit("conversation_state_changed", {
          conversation_id: id,
          previous_state: conv.flow_state,
          new_state: "work_in_progress",
          reason: "release_advance",
          timestamp: new Date().toISOString(),
        });
        io.to(`conversation_${id}`).emit("new_message", { conversation_id: id, message: msg });
      }

      const payment_breakdown = await getPaymentBreakdownForConversation(updatedConv);
      return res.json({ success: true, transaction: txn, conversation: updatedConv, message: msg, payment_breakdown });
    } catch (error) {
      console.error("releaseAdvance error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async releaseFinal(req, res) {
    try {
      const { id } = req.params;
      const { amount, currency = "INR", payout_reference, attachments = [], notes, commission_percent } = req.body || {};
      if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
      if (!amount || amount <= 0) return res.status(400).json({ success: false, error: "Valid amount required" });

      const conv = await fetchConversation(id);
      if (conv.flow_state !== "work_approved") {
        return res.status(409).json({ success: false, error: "Final can be released only after work_approved" });
      }

      // Record payout to influencer
      const payout = {
        conversation_id: id,
        direction: "out",
        type: "debit",
        status: "completed",
        amount: amount,
        amount_paise: Math.round(Number(amount) * 100),
        notes: notes || `Final payment released to influencer for conversation ${id}`,
        payment_stage: "final",
        admin_payment_tracking_id: payout_reference || null,
        receiver_id: conv.influencer_id,
        sender_id: req.user.id,
      };
      const { data: txn, error: txnErr } = await supabaseAdmin
        .from("transactions")
        .insert(payout)
        .select()
        .single();
      if (txnErr) return res.status(500).json({ success: false, error: txnErr.message });

      // Move state to closed
      const updatedConv = await updateConversationState(id, conv.flow_state, "closed", null);

      const msg = await createAutomatedMessage({
        conversationId: id,
        senderId: req.user.id,
        receiverId: conv.influencer_id,
        text: `Admin released final ₹${amount}${commission_percent ? ` (commission ${commission_percent}%)` : ""}. Conversation closed.`,
        attachments,
      });

      const io = getIO(req);
      if (io) {
        io.to(`conversation_${id}`).emit("conversation_state_changed", {
          conversation_id: id,
          previous_state: conv.flow_state,
          new_state: "closed",
          reason: "release_final",
          timestamp: new Date().toISOString(),
        });
        io.to(`conversation_${id}`).emit("new_message", { conversation_id: id, message: msg });
      }

      const payment_breakdown = await getPaymentBreakdownForConversation(updatedConv);
      return res.json({ success: true, transaction: txn, conversation: updatedConv, message: msg, payment_breakdown });
    } catch (error) {
      console.error("releaseFinal error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async refundFinal(req, res) {
    try {
      const { id } = req.params;
      const { amount, currency = "INR", refund_reference, attachments = [], notes } = req.body || {};
      if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
      if (!amount || amount <= 0) return res.status(400).json({ success: false, error: "Valid amount required" });

      const conv = await fetchConversation(id);

      // Record refund back to brand owner
      const refund = {
        conversation_id: id,
        direction: "out",
        type: "debit",
        status: "completed",
        amount: amount,
        amount_paise: Math.round(Number(amount) * 100),
        notes: notes || `Final refund paid back to brand owner for conversation ${id}`,
        payment_stage: "refund_final",
        admin_payment_tracking_id: refund_reference || null,
        receiver_id: conv.brand_owner_id,
        sender_id: req.user.id,
      };
      const { data: txn, error: txnErr } = await supabaseAdmin
        .from("transactions")
        .insert(refund)
        .select()
        .single();
      if (txnErr) return res.status(500).json({ success: false, error: txnErr.message });

      const msg = await createAutomatedMessage({
        conversationId: id,
        senderId: req.user.id,
        receiverId: conv.brand_owner_id,
        text: `Admin refunded ₹${amount} to brand owner`,
        attachments,
      });

      const io = getIO(req);
      if (io) {
        io.to(`conversation_${id}`).emit("new_message", { conversation_id: id, message: msg });
      }

      const payment_breakdown = await getPaymentBreakdownForConversation(conv);
      return res.json({ success: true, transaction: txn, message: msg, payment_breakdown });
    } catch (error) {
      console.error("refundFinal error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = {
  ConversationController: new ConversationController(),
};


