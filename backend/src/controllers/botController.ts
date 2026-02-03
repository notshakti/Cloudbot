import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types';
import { Bot } from '../models/Bot';
import { Organization } from '../models/Organization';
import { Conversation } from '../models/Conversation';
import { Intent } from '../models/Intent';
import type { BotType } from '../types';
import { getTemplateForPurpose, getTemplateByType, suggestBotName } from '../services/botTemplates';

const planBotLimits: Record<string, number> = {
  free: 99999,
  starter: 99999,
  professional: 99999,
  enterprise: 99999,
};

export async function listBots(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const bots = await Bot.find({ orgId }).sort({ updatedAt: -1 }).select('-integrations.channels');
    res.json({ success: true, data: bots });
  } catch (err) {
    console.error('[Bot] List error:', err);
    res.status(500).json({ success: false, message: 'Failed to list bots' });
  }
}

export async function createBot(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId, userId } = req.user!;
    const org = await Organization.findById(orgId);
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }
    const limit = planBotLimits[org.plan] ?? 1;
    const count = await Bot.countDocuments({ orgId });
    if (count >= limit) {
      res.status(403).json({
        success: false,
        message: `Plan limit reached (${limit} bots). Upgrade to add more.`,
      });
      return;
    }

    const { name, type, description } = req.body;
    const bot = await Bot.create({
      orgId,
      name: name || 'My Chatbot',
      type: type || 'custom',
      description: description || '',
      status: 'draft',
      createdBy: userId,
    });

    await Organization.findByIdAndUpdate(orgId, {
      $inc: { 'billing.usage.botsCreated': 1 },
    });

    res.status(201).json({ success: true, data: bot });
  } catch (err) {
    console.error('[Bot] Create error:', err);
    res.status(500).json({ success: false, message: 'Failed to create bot' });
  }
}

/**
 * Create a bot from a natural-language purpose; auto-train with template intents and set deployment-ready.
 */
export async function createBotFromDescription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId, userId } = req.user!;
    const org = await Organization.findById(orgId);
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }
    const limit = planBotLimits[org.plan] ?? 1;
    const count = await Bot.countDocuments({ orgId });
    if (count >= limit) {
      res.status(403).json({
        success: false,
        message: `Plan limit reached (${limit} bots). Upgrade to add more.`,
      });
      return;
    }

    const { purpose, name: nameInput } = req.body as { purpose?: string; name?: string };
    const purposeStr = (purpose || '').trim() || 'General purpose chatbot';
    const template = getTemplateForPurpose(purposeStr);
    const botName = (nameInput || '').trim() || suggestBotName(purposeStr);

    const bot = await Bot.create({
      orgId,
      name: botName,
      type: template.type,
      description: template.description,
      status: 'active',
      createdBy: userId,
      config: {
        welcomeMessage: template.welcomeMessage,
      },
      lastDeployedAt: new Date(),
    });

    await Organization.findByIdAndUpdate(orgId, {
      $inc: { 'billing.usage.botsCreated': 1 },
    });

    for (let i = 0; i < template.intents.length; i++) {
      const intent = template.intents[i];
      await Intent.create({
        botId: bot._id,
        name: intent.name,
        displayName: intent.displayName,
        category: template.type,
        trainingPhrases: intent.trainingPhrases.map((text) => ({ text, language: 'en' })),
        responses: [{ text: intent.response, language: 'en' }],
        priority: template.intents.length - i,
      });
    }

    const populated = await Bot.findById(bot._id);
    res.status(201).json({
      success: true,
      data: populated || bot,
      message: 'Bot created and trained. Ready to deploy.',
    });
  } catch (err) {
    console.error('[Bot] Create from description error:', err);
    res.status(500).json({ success: false, message: 'Failed to create bot' });
  }
}

const VALID_TEMPLATE_IDS: BotType[] = [
  'customer_service', 'education', 'ecommerce', 'medical', 'hr',
  'real_estate', 'financial', 'restaurant', 'it_helpdesk', 'custom',
];

/**
 * Create a bot from a pre-defined template (e.g. education, customer_service).
 */
export async function createBotFromTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId, userId } = req.user!;
    const { templateId } = req.params;
    const org = await Organization.findById(orgId);
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }
    const limit = planBotLimits[org.plan] ?? 1;
    const count = await Bot.countDocuments({ orgId });
    if (count >= limit) {
      res.status(403).json({
        success: false,
        message: `Plan limit reached (${limit} bots). Upgrade to add more.`,
      });
      return;
    }
    const type = templateId as BotType;
    if (!VALID_TEMPLATE_IDS.includes(type)) {
      res.status(400).json({ success: false, message: 'Invalid template ID' });
      return;
    }
    const template = getTemplateByType(type);
    const { name: nameInput } = req.body as { name?: string };
    const botName = (nameInput || '').trim() || template.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) + ' Bot';

    const bot = await Bot.create({
      orgId,
      name: botName,
      type: template.type,
      description: template.description,
      status: 'active',
      createdBy: userId,
      config: { welcomeMessage: template.welcomeMessage },
      lastDeployedAt: new Date(),
    });

    await Organization.findByIdAndUpdate(orgId, { $inc: { 'billing.usage.botsCreated': 1 } });

    for (let i = 0; i < template.intents.length; i++) {
      const intent = template.intents[i];
      await Intent.create({
        botId: bot._id,
        name: intent.name,
        displayName: intent.displayName,
        category: template.type,
        trainingPhrases: intent.trainingPhrases.map((text) => ({ text, language: 'en' })),
        responses: [{ text: intent.response, language: 'en' }],
        priority: template.intents.length - i,
      });
    }

    const populated = await Bot.findById(bot._id);
    res.status(201).json({
      success: true,
      data: populated || bot,
      message: 'Bot created from template. Ready to deploy.',
    });
  } catch (err) {
    console.error('[Bot] Create from template error:', err);
    res.status(500).json({ success: false, message: 'Failed to create bot' });
  }
}

export async function getBot(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const bot = await Bot.findOne({ _id: req.params.botId, orgId });
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    res.json({ success: true, data: bot });
  } catch (err) {
    console.error('[Bot] Get error:', err);
    res.status(500).json({ success: false, message: 'Failed to get bot' });
  }
}

const allowedBotUpdateFields = [
  'name', 'type', 'description', 'status', 'version',
  'config', 'appearance', 'integrations', 'lastDeployedAt',
];

export async function updateBot(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const update: Record<string, unknown> = {};
    for (const key of allowedBotUpdateFields) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const bot = await Bot.findOneAndUpdate(
      { _id: req.params.botId, orgId },
      { $set: update },
      { new: true }
    );
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    res.json({ success: true, data: bot });
  } catch (err) {
    console.error('[Bot] Update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update bot' });
  }
}

export async function deleteBot(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const bot = await Bot.findOneAndDelete({ _id: req.params.botId, orgId });
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    await Organization.findByIdAndUpdate(orgId, {
      $inc: { 'billing.usage.botsCreated': -1 },
    });
    res.json({ success: true, message: 'Bot deleted' });
  } catch (err) {
    console.error('[Bot] Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete bot' });
  }
}

const API_BASE = process.env.API_URL || 'http://localhost:3000';

export async function getEmbedCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const { botId } = req.params;
    const bot = await Bot.findOne({ _id: botId, orgId }).select('name config appearance');
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    const apiBase = API_BASE.replace(/\/$/, '');
    const chatUrl = `${apiBase}/api/chat/${botId}/message`;
    const primaryColor = bot.appearance?.primaryColor || '#6366f1';
    const position = bot.appearance?.position || 'bottom-right';
    const posStyle = position === 'bottom-right' ? 'right:20px;bottom:20px' : 'left:20px;bottom:20px';
    const embedCode = `<!-- CloudBot widget for ${bot.name} -->
<script>
(function() {
  var botId = '${botId}';
  var apiBase = '${apiBase}';
  var sessionId = null;
  var primaryColor = '${primaryColor}';
  var posStyle = '${posStyle}';
  var panel = document.createElement('div');
  panel.style.cssText = 'display:none;width:380px;height:500px;background:#1e293b;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.3);position:fixed;' + posStyle + ';z-index:9999;flex-direction:column;font-family:sans-serif;';
  panel.innerHTML = '<div style="padding:12px;background:' + primaryColor + ';color:#fff;border-radius:12px 12px 0 0;">Chat</div><div id="cb-msgs" style="flex:1;overflow-y:auto;padding:12px;height:380px;"></div><div style="padding:8px;border-top:1px solid #334155;"><input id="cb-input" style="width:100%;padding:10px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#fff;" placeholder="Type a message..." /></div>';
  var btn = document.createElement('button');
  btn.innerHTML = '💬';
  btn.style.cssText = 'width:60px;height:60px;border-radius:50%;border:none;background:' + primaryColor + ';color:#fff;font-size:24px;cursor:pointer;position:fixed;' + posStyle + ';z-index:9998;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
  function addMsg(role, text) { var m = document.createElement('div'); m.style.marginBottom = '8px'; m.style.color = role === 'user' ? '#93c5fd' : '#e2e8f0'; m.textContent = (role === 'user' ? 'You: ' : '') + text; document.getElementById('cb-msgs').appendChild(m); m.scrollIntoView(); }
  function send() { var input = document.getElementById('cb-input'); var msg = (input.value || '').trim(); if (!msg) return; input.value = ''; addMsg('user', msg); fetch(apiBase + '/api/chat/' + botId + '/message', { method: 'POST', headers: { \"Content-Type\": \"application/json\" }, body: JSON.stringify({ message: msg, sessionId: sessionId }) }).then(function(r) { return r.json(); }).then(function(d) { if (d.data && d.data.sessionId) sessionId = d.data.sessionId; if (d.data && d.data.response && d.data.response.text) addMsg('bot', d.data.response.text); }); }
  btn.onclick = function() { panel.style.display = panel.style.display === 'none' ? 'flex' : 'none'; btn.style.display = panel.style.display === 'none' ? 'block' : 'none'; };
  document.getElementById('cb-input').onkeydown = function(e) { if (e.key === 'Enter') send(); };
  document.body.appendChild(btn);
  document.body.appendChild(panel);
  window.CloudBot = { open: function() { panel.style.display = 'flex'; btn.style.display = 'none'; }, close: function() { panel.style.display = 'none'; btn.style.display = 'block'; } };
})();
</script>
<!-- Or use chat API: POST ${chatUrl} with body { message: string, sessionId?: string } -->`;
    res.json({ success: true, data: { embedCode, chatApiUrl: chatUrl } });
  } catch (err) {
    console.error('[Bot] Embed code error:', err);
    res.status(500).json({ success: false, message: 'Failed to get embed code' });
  }
}

export async function getChannels(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const { botId } = req.params;
    const bot = await Bot.findOne({ _id: botId, orgId }).select('integrations');
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    const channels = bot.integrations?.channels || {};
    const safe: Record<string, { enabled: boolean; configured: boolean }> = {};
    for (const [name, cfg] of Object.entries(channels)) {
      const c = cfg as { enabled?: boolean; [key: string]: unknown };
      safe[name] = {
        enabled: !!c.enabled,
        configured: !!(c.twilioAccountSid || c.pageAccessToken || c.botToken),
      };
    }
    res.json({ success: true, data: { web: { enabled: true, configured: true }, ...safe } });
  } catch (err) {
    console.error('[Bot] Channels error:', err);
    res.status(500).json({ success: false, message: 'Failed to get channels' });
  }
}

export async function updateChannel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const { botId, channel } = req.params;
    const allowedChannels = ['web', 'whatsapp', 'facebook', 'slack'];
    if (!allowedChannels.includes(channel)) {
      res.status(400).json({ success: false, message: 'Invalid channel' });
      return;
    }
    const bot = await Bot.findOne({ _id: botId, orgId });
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    const updates = req.body;
    const key = `integrations.channels.${channel}`;
    const current = (bot.integrations?.channels as Record<string, unknown>)?.[channel] || {};
    const merged = { ...(current as object), ...updates };
    await Bot.findByIdAndUpdate(botId, { $set: { [key]: merged } });
    res.json({ success: true, data: merged });
  } catch (err) {
    console.error('[Bot] Update channel error:', err);
    res.status(500).json({ success: false, message: 'Failed to update channel' });
  }
}

export async function getBotAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgId } = req.user!;
    const { botId } = req.params;
    const bot = await Bot.findOne({ _id: botId, orgId }).select('_id');
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    const id = new mongoose.Types.ObjectId(botId);

    const [totalConv, msgAgg, ratingAgg, byDay] = await Promise.all([
      Conversation.countDocuments({ botId: id }),
      Conversation.aggregate<{ total: number }>([
        { $match: { botId: id } },
        { $project: { count: { $size: '$messages' } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ]),
      Conversation.aggregate<{ avg: number }>([
        { $match: { botId: id, 'feedback.rating': { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$feedback.rating' } } },
      ]),
      Conversation.aggregate<{ _id: string; count: number }>([
        { $match: { botId: id } },
        { $unwind: '$messages' },
        { $match: { 'messages.timestamp': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$messages.timestamp' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const totalMessages = msgAgg[0]?.total ?? 0;
    const averageRating = ratingAgg[0]?.avg ?? 0;
    const messagesByDay = byDay.map((d) => ({ date: d._id, count: d.count }));

    res.json({
      success: true,
      data: {
        totalConversations: totalConv,
        totalMessages,
        averageRating: Math.round(averageRating * 10) / 10,
        activeUsers: totalConv,
        messagesByDay,
      },
    });
  } catch (err) {
    console.error('[Bot] Analytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
}
