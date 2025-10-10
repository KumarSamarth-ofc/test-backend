const { supabaseAdmin } = require('../supabase/client');
const fcmService = require('../services/fcmService');

class ReportController {
  async createReport(req, res) {
    try {
      const reporterId = req.user.id;
      const reporterRole = req.user.role;
      const { reported_user_id, conversation_id, reason_id, reason_text } = req.body;

      if (!reported_user_id) {
        return res.status(400).json({ success: false, message: 'reported_user_id is required' });
      }
      if (reported_user_id === reporterId) {
        return res.status(400).json({ success: false, message: 'You cannot report yourself' });
      }

      // Optional: validate conversation belongs to both parties if provided
      if (conversation_id) {
        const { data: conv, error: convErr } = await supabaseAdmin
          .from('conversations')
          .select('id, brand_owner_id, influencer_id')
          .eq('id', conversation_id)
          .single();
        if (convErr || !conv) {
          return res.status(400).json({ success: false, message: 'Invalid conversation_id' });
        }
        if (![conv.brand_owner_id, conv.influencer_id].includes(reporterId) ||
            ![conv.brand_owner_id, conv.influencer_id].includes(reported_user_id)) {
          return res.status(403).json({ success: false, message: 'Conversation does not involve given users' });
        }
      }

      // Optional: validate reason_id exists if provided
      if (reason_id) {
        const { data: reason, error: reasonErr } = await supabaseAdmin
          .from('report_reasons')
          .select('id, is_active')
          .eq('id', reason_id)
          .single();
        if (reasonErr || !reason || !reason.is_active) {
          return res.status(400).json({ success: false, message: 'Invalid or inactive reason_id' });
        }
      }

      const insertRow = {
        reporter_id: reporterId,
        reporter_role: reporterRole,
        reported_user_id,
        conversation_id: conversation_id || null,
        reason_id: reason_id || null,
        reason_text: reason_text || null,
        status: 'open'
      };

      const { data, error } = await supabaseAdmin
        .from('user_reports')
        .insert(insertRow)
        .select('*, report_reasons(id, title)')
        .single();

      if (error) {
        return res.status(500).json({ success: false, message: 'Failed to create report' });
      }

      return res.json({ success: true, report: data });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async myReports(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;

      const { data, error, count } = await supabaseAdmin
        .from('user_reports')
        .select('*, report_reasons(id, title)', { count: 'exact' })
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch reports' });
      }

      return res.json({ success: true, reports: data || [], pagination: { page: pageNum, limit: limitNum, total: count || 0 } });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Admin: list reports with grouping/counts
  async listReports(req, res) {
    try {
      const { page = 1, limit = 20, status, reported_user_id } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;

      let query = supabaseAdmin
        .from('user_reports')
        .select('*, report_reasons(id, title), reporter:users!user_reports_reporter_id_fkey(id, name, role), reported:users!user_reports_reported_user_id_fkey(id, name, role)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (reported_user_id) query = query.eq('reported_user_id', reported_user_id);

      const { data, error, count } = await query.range(from, to);
      if (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch reports' });
      }

      // Aggregate counts per reported user
      const { data: counts } = await supabaseAdmin
        .from('user_reports')
        .select('reported_user_id, count:reported_user_id', { head: false })
        .group('reported_user_id');

      return res.json({ success: true, reports: data || [], counts: counts || [], pagination: { page: pageNum, limit: limitNum, total: count || 0 } });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Admin: CRUD report reasons
  async listReasons(req, res) {
    try {
      const { data, error } = await supabaseAdmin
        .from('report_reasons')
        .select('*')
        .order('is_active', { ascending: false })
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) return res.status(500).json({ success: false, message: 'Failed to fetch reasons' });
      return res.json({ success: true, reasons: data || [] });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async createReason(req, res) {
    try {
      const { title, description, is_active = true, position = 0 } = req.body;
      if (!title) return res.status(400).json({ success: false, message: 'title is required' });
      const { data, error } = await supabaseAdmin
        .from('report_reasons')
        .insert({ title, description: description || null, is_active, position })
        .select()
        .single();
      if (error) return res.status(500).json({ success: false, message: 'Failed to create reason' });
      return res.json({ success: true, reason: data });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async updateReason(req, res) {
    try {
      const { id } = req.params;
      const { title, description, is_active, position } = req.body;
      const update = { title, description, is_active, position };
      Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);
      const { data, error } = await supabaseAdmin
        .from('report_reasons')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (error) return res.status(500).json({ success: false, message: 'Failed to update reason' });
      return res.json({ success: true, reason: data });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async deleteReason(req, res) {
    try {
      const { id } = req.params;
      const { error } = await supabaseAdmin
        .from('report_reasons')
        .delete()
        .eq('id', id);
      if (error) return res.status(500).json({ success: false, message: 'Failed to delete reason' });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Admin: block/unblock users and notify
  async blockUser(req, res) {
    try {
      const adminUser = req.user;
      const { user_id, reason, blocked_until } = req.body;
      if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required' });

      const update = { is_blocked: true, blocked_reason: reason || null };
      if (blocked_until) update.blocked_until = new Date(blocked_until).toISOString();

      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update(update)
        .eq('id', user_id)
        .select('id, name, phone, role, is_blocked, blocked_until, blocked_reason')
        .single();
      if (error) return res.status(500).json({ success: false, message: 'Failed to block user' });

      // Record event
      await supabaseAdmin
        .from('user_block_events')
        .insert({ user_id, action: 'block', reason: reason || null, performed_by: adminUser.id, blocked_until: update.blocked_until || null });

      // Notify user
      try {
        await fcmService.sendNotificationToUser(user_id, {
          title: 'Account Restricted',
          body: reason ? `You have been blocked: ${reason}` : 'Your account has been blocked by admin',
          data: { type: 'account_blocked' },
          clickAction: '/'
        });
      } catch (e) {}

      return res.json({ success: true, user: updatedUser });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async unblockUser(req, res) {
    try {
      const adminUser = req.user;
      const { user_id } = req.body;
      if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required' });

      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update({ is_blocked: false, blocked_until: null, blocked_reason: null })
        .eq('id', user_id)
        .select('id, name, phone, role, is_blocked')
        .single();
      if (error) return res.status(500).json({ success: false, message: 'Failed to unblock user' });

      // Record event
      await supabaseAdmin
        .from('user_block_events')
        .insert({ user_id, action: 'unblock', performed_by: adminUser.id });

      // Notify user
      try {
        await fcmService.sendNotificationToUser(user_id, {
          title: 'Account Restored',
          body: 'Your account has been unblocked by admin',
          data: { type: 'account_unblocked' },
          clickAction: '/'
        });
      } catch (e) {}

      return res.json({ success: true, user: updatedUser });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new ReportController();


