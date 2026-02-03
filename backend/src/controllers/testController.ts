import { Response } from 'express';
import { AuthRequest } from '../types';
import { Bot } from '../models/Bot';
import { getBotResponse } from '../services/nlpService';

export async function testBot(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }
    const bot = await Bot.findById(botId);
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    const result = await getBotResponse(botId, message);
    res.json({
      success: true,
      data: {
        response: result.response,
        intent: result.intent,
        confidence: result.confidence,
        source: result.source,
        ...(result.title && { title: result.title }),
      },
    });
  } catch (err) {
    console.error('[Test] Error:', err);
    res.status(500).json({ success: false, message: 'Test failed' });
  }
}
