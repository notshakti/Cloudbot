import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types';
import { UnrecognizedQuery } from '../models/UnrecognizedQuery';
import { Intent } from '../models/Intent';

export async function listUnrecognized(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const items = await UnrecognizedQuery.find({ botId, status: 'pending' })
      .sort({ count: -1, lastSeenAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: items });
  } catch (err) {
    console.error('[Unrecognized] List error:', err);
    res.status(500).json({ success: false, message: 'Failed to list unrecognized queries' });
  }
}

export async function convertToIntent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId, queryId } = req.params;
    const uq = await UnrecognizedQuery.findOne({ _id: queryId, botId, status: 'pending' });
    if (!uq) {
      res.status(404).json({ success: false, message: 'Unrecognized query not found' });
      return;
    }
    const name = 'intent_' + uq.text.slice(0, 20).replace(/\W/g, '_') + '_' + Date.now();
    const intent = await Intent.create({
      botId: new mongoose.Types.ObjectId(botId),
      name,
      displayName: uq.text.slice(0, 50),
      category: 'from_unrecognized',
      trainingPhrases: [{ text: uq.text, language: 'en' }],
      responses: [{ text: 'I understand. How can I help you with that?', language: 'en' }],
      priority: 0,
    });
    await UnrecognizedQuery.findByIdAndUpdate(uq._id, {
      status: 'converted',
      convertedToIntentId: intent._id,
    });
    res.json({ success: true, data: { intent, unrecognizedId: uq._id } });
  } catch (err) {
    console.error('[Unrecognized] Convert error:', err);
    res.status(500).json({ success: false, message: 'Failed to convert to intent' });
  }
}

export async function dismissUnrecognized(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId, queryId } = req.params;
    const uq = await UnrecognizedQuery.findOneAndUpdate(
      { _id: queryId, botId, status: 'pending' },
      { status: 'dismissed' },
      { new: true }
    );
    if (!uq) {
      res.status(404).json({ success: false, message: 'Unrecognized query not found' });
      return;
    }
    res.json({ success: true, message: 'Dismissed' });
  } catch (err) {
    console.error('[Unrecognized] Dismiss error:', err);
    res.status(500).json({ success: false, message: 'Failed to dismiss' });
  }
}
