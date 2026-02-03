import { Response } from 'express';
import { AuthRequest } from '../types';
import { Conversation } from '../models/Conversation';
import { Bot } from '../models/Bot';

/**
 * List conversations for a bot (admin). Filter by status (e.g. escalated).
 */
export async function listConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const { botId } = req.params;
    const status = req.query.status as string | undefined;

    const bot = await Bot.findOne({ _id: botId, orgId }).select('_id');
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }

    const filter: Record<string, unknown> = { botId };
    if (status) filter.status = status;

    const conversations = await Conversation.find(filter)
      .sort({ lastActivityAt: -1 })
      .limit(100)
      .select('-__v')
      .lean();

    res.json({ success: true, data: conversations });
  } catch (err) {
    console.error('[Conversation] List error:', err);
    res.status(500).json({ success: false, message: 'Failed to list conversations' });
  }
}

/**
 * Get single conversation (admin).
 */
export async function getConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const { botId, conversationId } = req.params;

    const bot = await Bot.findOne({ _id: botId, orgId }).select('_id');
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }

    const conv = await Conversation.findOne({ _id: conversationId, botId }).lean();
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    res.json({ success: true, data: conv });
  } catch (err) {
    console.error('[Conversation] Get error:', err);
    res.status(500).json({ success: false, message: 'Failed to get conversation' });
  }
}

/**
 * Resolve an escalated conversation (human takeover complete).
 */
export async function resolveConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const { botId, conversationId } = req.params;

    const bot = await Bot.findOne({ _id: botId, orgId }).select('_id');
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }

    const conv = await Conversation.findOne({ _id: conversationId, botId });
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    conv.status = 'resolved';
    conv.endedAt = new Date();
    if (!conv.escalation) conv.escalation = { wasEscalated: true };
    conv.escalation.resolvedAt = new Date();
    conv.escalation.resolvedBy = req.user?.userId;
    await conv.save();

    res.json({ success: true, data: conv, message: 'Conversation resolved' });
  } catch (err) {
    console.error('[Conversation] Resolve error:', err);
    res.status(500).json({ success: false, message: 'Failed to resolve conversation' });
  }
}
