import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Bot } from '../models/Bot';

export async function ensureBotAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { botId } = req.params;
    const { orgId } = req.user!;
    const bot = await Bot.findOne({ _id: botId, orgId });
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    (req as AuthRequest & { bot: typeof bot }).bot = bot;
    next();
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load bot' });
  }
}
