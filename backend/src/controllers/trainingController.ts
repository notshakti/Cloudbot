import { Response } from 'express';
import { AuthRequest } from '../types';
import { Bot } from '../models/Bot';
import { Intent } from '../models/Intent';
import { KnowledgeBase } from '../models/KnowledgeBase';

export async function getTrainingStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { orgId } = req.user!;
    const bot = await Bot.findOne({ _id: botId, orgId });
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    const intentCount = await Intent.countDocuments({ botId, isActive: true });
    const kbCount = await KnowledgeBase.countDocuments({ botId, isActive: true, 'processing.status': 'completed' });
    res.json({
      success: true,
      data: {
        status: 'ready',
        lastTrained: bot.updatedAt,
        intentCount,
        kbItemCount: kbCount,
        ready: intentCount > 0 || kbCount > 0,
      },
    });
  } catch (err) {
    console.error('[Training] Status error:', err);
    res.status(500).json({ success: false, message: 'Failed to get training status' });
  }
}

export async function validateBot(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { orgId } = req.user!;
    const bot = await Bot.findOne({ _id: botId, orgId });
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    const intentCount = await Intent.countDocuments({ botId, isActive: true });
    const intentsWithResponses = await Intent.countDocuments({
      botId,
      isActive: true,
      'responses.0': { $exists: true },
    });
    const issues: string[] = [];
    if (intentCount === 0) issues.push('No intents configured');
    if (intentsWithResponses < intentCount) issues.push('Some intents have no responses');
    if (!bot.config?.welcomeMessage?.trim()) issues.push('Welcome message is empty');
    res.json({
      success: true,
      data: {
        valid: issues.length === 0,
        issues,
        intentCount,
        intentsWithResponses,
      },
    });
  } catch (err) {
    console.error('[Training] Validate error:', err);
    res.status(500).json({ success: false, message: 'Validation failed' });
  }
}
