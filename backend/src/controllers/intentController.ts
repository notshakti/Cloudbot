import { Response } from 'express';
import { AuthRequest } from '../types';
import { Intent } from '../models/Intent';

export async function listIntents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const intents = await Intent.find({ botId }).sort({ priority: -1, name: 1 });
    res.json({ success: true, data: intents });
  } catch (err) {
    console.error('[Intent] List error:', err);
    res.status(500).json({ success: false, message: 'Failed to list intents' });
  }
}

export async function createIntent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { name, displayName, category, trainingPhrases, responses, priority } = req.body;
    const existing = await Intent.findOne({ botId, name: name || displayName });
    if (existing) {
      res.status(400).json({ success: false, message: 'Intent with this name already exists' });
      return;
    }
    const intent = await Intent.create({
      botId,
      name: name || displayName || 'intent_' + Date.now(),
      displayName: displayName || name || 'New Intent',
      category: category || '',
      trainingPhrases: Array.isArray(trainingPhrases) ? trainingPhrases : [],
      responses: Array.isArray(responses) ? responses : [{ text: 'Response placeholder', language: 'en' }],
      priority: priority ?? 0,
    });
    res.status(201).json({ success: true, data: intent });
  } catch (err) {
    console.error('[Intent] Create error:', err);
    res.status(500).json({ success: false, message: 'Failed to create intent' });
  }
}

export async function getIntent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId, intentId } = req.params;
    const intent = await Intent.findOne({ _id: intentId, botId });
    if (!intent) {
      res.status(404).json({ success: false, message: 'Intent not found' });
      return;
    }
    res.json({ success: true, data: intent });
  } catch (err) {
    console.error('[Intent] Get error:', err);
    res.status(500).json({ success: false, message: 'Failed to get intent' });
  }
}

export async function updateIntent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId, intentId } = req.params;
    const allowed = ['name', 'displayName', 'category', 'trainingPhrases', 'responses', 'parameters', 'contexts', 'priority', 'isActive'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const intent = await Intent.findOneAndUpdate(
      { _id: intentId, botId },
      { $set: update },
      { new: true }
    );
    if (!intent) {
      res.status(404).json({ success: false, message: 'Intent not found' });
      return;
    }
    res.json({ success: true, data: intent });
  } catch (err) {
    console.error('[Intent] Update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update intent' });
  }
}

export async function deleteIntent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId, intentId } = req.params;
    const intent = await Intent.findOneAndDelete({ _id: intentId, botId });
    if (!intent) {
      res.status(404).json({ success: false, message: 'Intent not found' });
      return;
    }
    res.json({ success: true, message: 'Intent deleted' });
  } catch (err) {
    console.error('[Intent] Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete intent' });
  }
}

export async function bulkCreateIntents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { intents } = req.body;
    if (!Array.isArray(intents) || intents.length === 0) {
      res.status(400).json({ success: false, message: 'intents array is required' });
      return;
    }
    const created = [];
    for (const item of intents) {
      const name = item.name || item.displayName || 'intent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const existing = await Intent.findOne({ botId, name });
      if (existing) continue;
      const intent = await Intent.create({
        botId,
        name,
        displayName: item.displayName || item.name || name,
        category: item.category || '',
        trainingPhrases: Array.isArray(item.trainingPhrases) ? item.trainingPhrases : [],
        responses: Array.isArray(item.responses) && item.responses.length > 0
          ? item.responses
          : [{ text: item.responseText || 'Response', language: 'en' }],
        priority: item.priority ?? 0,
      });
      created.push(intent);
    }
    res.status(201).json({ success: true, data: created, count: created.length });
  } catch (err) {
    console.error('[Intent] Bulk create error:', err);
    res.status(500).json({ success: false, message: 'Failed to bulk create intents' });
  }
}

export async function exportIntents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const intents = await Intent.find({ botId }).sort({ name: 1 }).lean();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=intents.json');
    res.json({ success: true, data: intents });
  } catch (err) {
    console.error('[Intent] Export error:', err);
    res.status(500).json({ success: false, message: 'Failed to export intents' });
  }
}

export async function importIntents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { intents } = req.body;
    if (!Array.isArray(intents)) {
      res.status(400).json({ success: false, message: 'intents array is required' });
      return;
    }
    const created = [];
    for (const item of intents) {
      const name = item.name || item.displayName || 'intent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const existing = await Intent.findOne({ botId, name });
      if (existing) continue;
      const intent = await Intent.create({
        botId,
        name,
        displayName: item.displayName || item.name || name,
        category: item.category || '',
        trainingPhrases: Array.isArray(item.trainingPhrases) ? item.trainingPhrases : [],
        responses: Array.isArray(item.responses) && item.responses.length > 0
          ? item.responses
          : [{ text: item.responseText || 'Response', language: 'en' }],
        priority: item.priority ?? 0,
      });
      created.push(intent);
    }
    res.status(201).json({ success: true, data: created, count: created.length });
  } catch (err) {
    console.error('[Intent] Import error:', err);
    res.status(500).json({ success: false, message: 'Failed to import intents' });
  }
}
