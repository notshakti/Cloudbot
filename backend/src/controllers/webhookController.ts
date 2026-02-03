import { Request, Response } from 'express';
import crypto from 'crypto';
import { Bot } from '../models/Bot';
import { Conversation } from '../models/Conversation';
import { getBotResponse } from '../services/nlpService';
import { sendWhatsAppReply, sendFacebookReply, sendSlackReply } from '../services/channelSend';
import { config } from '../config';

function getSessionId(channel: string, externalId: string): string {
  return `ext_${channel}_${externalId}`;
}

export async function whatsappWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    if (req.method === 'GET') {
      res.status(200).send('WhatsApp webhook endpoint. Use POST to receive messages.');
      return;
    }
    const bot = await Bot.findOne({ _id: botId }).select('integrations');
    if (!bot) {
      res.status(404).send('Bot not found');
      return;
    }
    const channels = bot.integrations?.channels as Record<string, { enabled?: boolean; twilioAccountSid?: string; twilioAuthToken?: string; fromNumber?: string }> | undefined;
    const wa = channels?.whatsapp;
    if (!wa?.enabled) {
      res.status(200).send('OK');
      return;
    }
    const body = req.body as { Body?: string; From?: string; To?: string };
    const from = body.From;
    const text = (body.Body || '').trim();
    if (!from || !text) {
      res.status(200).send('OK');
      return;
    }
    const sessionId = getSessionId('whatsapp', from);
    let conv = await Conversation.findOne({ botId, sessionId });
    if (!conv) {
      conv = await Conversation.create({
        botId,
        sessionId,
        channel: 'whatsapp',
        user: { userId: from },
        messages: [],
        status: 'active',
        startedAt: new Date(),
        lastActivityAt: new Date(),
      });
    }
    conv.messages.push({ sender: 'user', text, timestamp: new Date() });
    conv.lastActivityAt = new Date();
    await conv.save();

    const result = await getBotResponse(botId, text);
    conv.messages.push({
      sender: 'bot',
      text: result.response.text,
      timestamp: new Date(),
      nlp: { intent: result.intent, confidence: result.confidence, source: result.source },
    });
    await conv.save();

    await sendWhatsAppReply(from, result.response.text, {
      twilioAccountSid: wa.twilioAccountSid,
      twilioAuthToken: wa.twilioAuthToken,
      fromNumber: wa.fromNumber,
    });
    res.status(200).send('OK');
  } catch (err) {
    console.error('[Webhook] WhatsApp error:', err);
    res.status(500).send('Error');
  }
}

export async function facebookWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      const verifyToken = config.facebook?.verifyToken || 'cloudbot_verify';
      if (mode === 'subscribe' && token === verifyToken) {
        res.status(200).send(challenge);
        return;
      }
      res.status(403).send('Forbidden');
      return;
    }
    const bot = await Bot.findOne({ _id: botId }).select('integrations');
    if (!bot) {
      res.status(404).send('Bot not found');
      return;
    }
    const channels = bot.integrations?.channels as Record<string, { enabled?: boolean; pageAccessToken?: string }> | undefined;
    const fb = channels?.facebook;
    if (!fb?.enabled) {
      res.status(200).send('OK');
      return;
    }
    const body = req.body as { object?: string; entry?: { messaging?: { sender?: { id: string }; recipient?: { id: string }; message?: { text?: string }; postback?: { payload?: string } }[] }[] };
    if (body.object !== 'page') {
      res.status(200).send('OK');
      return;
    }
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender?.id;
        const text = event.message?.text || event.postback?.payload || '';
        if (!senderId) continue;
        const sessionId = getSessionId('facebook', senderId);
        let conv = await Conversation.findOne({ botId, sessionId });
        if (!conv) {
          conv = await Conversation.create({
            botId,
            sessionId,
            channel: 'facebook',
            user: { userId: senderId },
            messages: [],
            status: 'active',
            startedAt: new Date(),
            lastActivityAt: new Date(),
          });
        }
        if (text) {
          conv.messages.push({ sender: 'user', text, timestamp: new Date() });
          conv.lastActivityAt = new Date();
          await conv.save();

          const result = await getBotResponse(botId, text);
          conv.messages.push({
            sender: 'bot',
            text: result.response.text,
            timestamp: new Date(),
            nlp: { intent: result.intent, confidence: result.confidence, source: result.source },
          });
          await conv.save();

          await sendFacebookReply(senderId, result.response.text, { pageAccessToken: fb.pageAccessToken });
        }
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('[Webhook] Facebook error:', err);
    res.status(500).send('Error');
  }
}

export async function slackWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const body = req.body as { type?: string; challenge?: string; event?: { type: string; channel?: string; user?: string; text?: string; ts?: string; thread_ts?: string } };
    if (body.type === 'url_verification') {
      res.status(200).json({ challenge: body.challenge });
      return;
    }
    const bot = await Bot.findOne({ _id: botId }).select('integrations');
    if (!bot) {
      res.status(404).send('Bot not found');
      return;
    }
    const channels = bot.integrations?.channels as Record<string, { enabled?: boolean; botToken?: string }> | undefined;
    const slack = channels?.slack;
    if (!slack?.enabled) {
      res.status(200).send('OK');
      return;
    }
    const event = body.event as { type?: string; subtype?: string; channel?: string; user?: string; text?: string; ts?: string; thread_ts?: string } | undefined;
    if (event?.type !== 'message' || (event as { subtype?: string }).subtype === 'bot_message') {
      res.status(200).send('OK');
      return;
    }
    const channelId = event.channel;
    const userId = event.user;
    const text = (event.text || '').trim();
    const threadTs = event.thread_ts || event.ts;
    if (!channelId || !text) {
      res.status(200).send('OK');
      return;
    }
    const sessionId = getSessionId('slack', `${channelId}_${userId}`);
    let conv = await Conversation.findOne({ botId, sessionId });
    if (!conv) {
      conv = await Conversation.create({
        botId,
        sessionId,
        channel: 'slack',
        user: { userId },
        messages: [],
        status: 'active',
        startedAt: new Date(),
        lastActivityAt: new Date(),
      });
    }
    conv.messages.push({ sender: 'user', text, timestamp: new Date() });
    conv.lastActivityAt = new Date();
    await conv.save();

    const result = await getBotResponse(botId, text);
    conv.messages.push({
      sender: 'bot',
      text: result.response.text,
      timestamp: new Date(),
      nlp: { intent: result.intent, confidence: result.confidence, source: result.source },
    });
    await conv.save();

    await sendSlackReply(channelId, result.response.text, { botToken: slack.botToken }, threadTs);
    res.status(200).send('OK');
  } catch (err) {
    console.error('[Webhook] Slack error:', err);
    res.status(500).send('Error');
  }
}
