import { Response } from 'express';
import { AuthRequest } from '../types';
import { listTemplates } from '../services/botTemplates';

/**
 * List available bot templates (marketplace / create flow).
 */
export async function getTemplates(req: AuthRequest, res: Response): Promise<void> {
  try {
    const templates = listTemplates();
    res.json({ success: true, data: templates });
  } catch (err) {
    console.error('[Template] List error:', err);
    res.status(500).json({ success: false, message: 'Failed to list templates' });
  }
}
