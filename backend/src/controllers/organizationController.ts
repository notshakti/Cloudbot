import { Response } from 'express';
import { AuthRequest } from '../types';
import { Organization } from '../models/Organization';

export async function getOrganization(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const org = await Organization.findById(orgId)
      .select('-apiKeys')
      .populate('members.userId', 'name email');
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  } catch (err) {
    console.error('[Org] Get error:', err);
    res.status(500).json({ success: false, message: 'Failed to get organization' });
  }
}

export async function updateOrganization(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const { name, settings } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (settings !== undefined) update.settings = settings;
    const org = await Organization.findByIdAndUpdate(
      orgId,
      { $set: update },
      { new: true }
    ).select('-apiKeys');
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  } catch (err) {
    console.error('[Org] Update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update organization' });
  }
}

export async function getUsage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const org = await Organization.findById(orgId).select('billing.usage plan');
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }
    res.json({ success: true, data: { usage: org.billing?.usage, plan: org.plan } });
  } catch (err) {
    console.error('[Org] Usage error:', err);
    res.status(500).json({ success: false, message: 'Failed to get usage' });
  }
}
