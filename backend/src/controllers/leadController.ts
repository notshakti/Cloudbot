import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { Lead } from '../models/Lead';
import { Bot } from '../models/Bot';
import { Conversation } from '../models/Conversation';

/**
 * Capture lead (public - from chat widget). Body: { sessionId, name?, email?, phone?, ...customFields }
 */
export async function captureLead(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { sessionId, name, email, phone, ...customFields } = req.body as Record<string, string>;

    if (!sessionId) {
      res.status(400).json({ success: false, message: 'sessionId is required' });
      return;
    }

    const bot = await Bot.findOne({ _id: botId, status: { $in: ['active', 'draft'] } });
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    if (!bot.config?.features?.leadCapture) {
      res.status(400).json({ success: false, message: 'Lead capture is not enabled for this bot' });
      return;
    }

    const conv = await Conversation.findOne({ botId, sessionId });
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    const lead = await Lead.create({
      botId,
      conversationId: conv._id,
      sessionId,
      channel: conv.channel || 'web',
      name: name || conv.user?.name,
      email: email || conv.user?.email,
      phone: phone || conv.user?.userId,
      customFields: typeof customFields === 'object' ? customFields : {},
    });

    if (conv.user) {
      if (name) conv.user.name = name;
      if (email) conv.user.email = email;
      if (phone) conv.user.userId = conv.user.userId || phone;
    } else {
      conv.user = { userId: phone, name, email };
    }
    await conv.save();

    res.status(201).json({ success: true, data: { leadId: lead._id, message: 'Lead captured' } });
  } catch (err) {
    console.error('[Lead] Capture error:', err);
    res.status(500).json({ success: false, message: 'Failed to capture lead' });
  }
}

/**
 * List leads for a bot (admin).
 */
export async function listLeads(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const { botId } = req.params;

    const bot = await Bot.findOne({ _id: botId, orgId }).select('_id');
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }

    const leads = await Lead.find({ botId }).sort({ capturedAt: -1 }).limit(500).lean();
    res.json({ success: true, data: leads });
  } catch (err) {
    console.error('[Lead] List error:', err);
    res.status(500).json({ success: false, message: 'Failed to list leads' });
  }
}
