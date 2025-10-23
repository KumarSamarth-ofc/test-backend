const { supabaseAdmin } = require('../supabase/client');
const fcmService = require('../services/fcmService');

class ReportController {
  async createReport(req, res) {
    try {
      const reporterId = req.user.id;
      const reporterRole = req.user.role;
      const {
        reported_user_id,
        conversation_id,
        reason_id,
        reason_text,
        reason_key, // e.g., communication_issue
        attachments = [], // optional array of attachments
        source = null, // e.g., 'chat_header'
        metadata = null // optional JSON object
      } = req.body || {};

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

      // Map reason_key → reason_id when provided (fallback to provided reason_id)
      let finalReasonId = reason_id || null;
      let finalReasonKey = reason_key || null;
      if (reason_key && !finalReasonId) {
        const normalized = String(reason_key).replace(/_/g, ' ').toLowerCase();
        const { data: foundReason } = await supabaseAdmin
          .from('report_reasons')
          .select('id, title, is_active')
          .ilike('title', `%${normalized}%`)
          .limit(1)
          .single();
        if (foundReason && foundReason.is_active) {
          finalReasonId = foundReason.id;
        }
      }

      // Optional: validate reason_id exists if provided
      if (finalReasonId) {
        const { data: reason, error: reasonErr } = await supabaseAdmin
          .from('report_reasons')
          .select('id, is_active')
          .eq('id', finalReasonId)
          .single();
        if (reasonErr || !reason || !reason.is_active) {
          return res.status(400).json({ success: false, message: 'Invalid or inactive reason_id' });
        }
      }

      // Rate limiting & flood control (basic): max 10 reports by reporter per hour; max 20 against same target per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentByReporter } = await supabaseAdmin
        .from('user_reports')
        .select('id')
        .eq('reporter_id', reporterId)
        .gt('created_at', oneHourAgo);
      if ((recentByReporter || []).length >= 10) {
        return res.status(429).json({ success: false, message: 'Rate limit exceeded. Please try again later.' });
      }
      const { data: recentAgainstTarget } = await supabaseAdmin
        .from('user_reports')
        .select('id')
        .eq('reported_user_id', reported_user_id)
        .gt('created_at', oneHourAgo);
      if ((recentAgainstTarget || []).length > 200) {
        return res.status(429).json({ success: false, message: 'Too many reports against the target in a short time.' });
      }

      // Idempotency & deduplication (24h cooldown for same tuple)
      const idempotencyKey = req.headers['idempotency-key'] || null;
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      let dedupQuery = supabaseAdmin
        .from('user_reports')
        .select('*, report_reasons(id, title)')
        .eq('reporter_id', reporterId)
        .eq('reported_user_id', reported_user_id)
        .is('status', null) // Some rows may have null; also include open
        .or('status.eq.open,status.is.null')
        .gte('created_at', dayAgo);
      if (conversation_id) dedupQuery = dedupQuery.eq('conversation_id', conversation_id);
      if (finalReasonId) dedupQuery = dedupQuery.eq('reason_id', finalReasonId);
      const { data: existingOpen } = await dedupQuery.limit(1).maybeSingle();
      if (existingOpen) {
        return res.json({ success: true, report: existingOpen, idempotent: true, deduplicated: true });
      }

      const baseInsert = {
        reporter_id: reporterId,
        reporter_role: reporterRole,
        reported_user_id,
        conversation_id: conversation_id || null,
        reason_id: finalReasonId || null,
        reason_text: reason_text || null,
        status: 'open'
      };

      // Try richer insert with new columns (reason_key, attachments, source, metadata)
      let inserted = null;
      let insertError = null;
      try {
        const { data, error } = await supabaseAdmin
          .from('user_reports')
          .insert({
            ...baseInsert,
            reason_key: finalReasonKey || null,
            attachments: attachments && attachments.length ? attachments : null,
            source: source || null,
            metadata: metadata || null,
          })
          .select('*, report_reasons(id, title)')
          .single();
        inserted = data; insertError = error || null;
      } catch (e) {
        insertError = e;
      }

      // Fallback to minimal insert if columns don't exist
      if (insertError) {
        const mergedText = reason_text || finalReasonKey ? `${reason_text || ''} ${finalReasonKey ? `(key: ${finalReasonKey})` : ''}`.trim() : null;
        const { data, error } = await supabaseAdmin
          .from('user_reports')
          .insert({
            ...baseInsert,
            reason_text: mergedText,
          })
          .select('*, report_reasons(id, title)')
          .single();
        inserted = data;
        if (error) return res.status(500).json({ success: false, message: 'Failed to create report' });
      }

      // Notify admins (best-effort)
      try {
        const notificationService = require('../services/notificationService');
        const { data: admins } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .eq('is_deleted', false);
        if (admins && admins.length) {
          await Promise.all(admins.map(a => notificationService.storeNotification({
            user_id: a.id,
            type: 'message',
            title: 'New report created',
            message: `Report by ${reporterRole} ${reporterId} against ${reported_user_id}`,
            data: { report_id: inserted.id, reporter_id: reporterId, reported_user_id, conversation_id, reason_id: finalReasonId, reason_key: finalReasonKey },
            priority: 'high'
          }))
          );
        }
      } catch (_) {}

      return res.json({ success: true, report: inserted, idempotent: !!idempotencyKey, reason_key: finalReasonKey || null });
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

  // Admin: update report status
  async updateReportStatus(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin only' });
      }
      const { id } = req.params;
      const { action, notes } = req.body || {};
      const allowed = new Set(['acknowledge', 'dismiss', 'escalate', 'resolve']);
      if (!allowed.has(action)) {
        return res.status(400).json({ success: false, message: 'Invalid action' });
      }

      const statusMap = {
        acknowledge: 'in_review',
        dismiss: 'dismissed',
        escalate: 'in_review',
        resolve: 'resolved'
      };

      const { data: existing, error: findErr } = await supabaseAdmin
        .from('user_reports')
        .select('*')
        .eq('id', id)
        .single();
      if (findErr || !existing) return res.status(404).json({ success: false, message: 'Report not found' });

      const { data: updated, error: updErr } = await supabaseAdmin
        .from('user_reports')
        .update({ status: statusMap[action], updated_at: new Date().toISOString(), admin_notes: notes || null })
        .eq('id', id)
        .select()
        .single();
      if (updErr) return res.status(500).json({ success: false, message: 'Failed to update status' });

      // Best-effort audit trail if table exists
      try {
        await supabaseAdmin
          .from('user_report_events')
          .insert({ report_id: id, action, notes: notes || null, performed_by: req.user.id });
      } catch (_) {}

      return res.json({ success: true, report: updated });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new ReportController();


