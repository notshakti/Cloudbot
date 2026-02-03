/**
 * Send reply to external channels (WhatsApp via Twilio, Facebook Messenger, Slack).
 * Uses per-bot config from integrations.channels or fallback to env.
 */

import { config } from '../config';
import type { ChannelType } from './channelFormat';
import { formatResponseForChannel } from './channelFormat';

interface WhatsAppConfig {
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  fromNumber?: string;
}

interface FacebookConfig {
  pageAccessToken?: string;
}

interface SlackConfig {
  botToken?: string;
}

export async function sendWhatsAppReply(
  to: string,
  text: string,
  botConfig?: WhatsAppConfig
): Promise<boolean> {
  const sid = botConfig?.twilioAccountSid || config.twilio?.accountSid;
  const token = botConfig?.twilioAuthToken || config.twilio?.authToken;
  const from = botConfig?.fromNumber || config.twilio?.whatsappFrom;
  if (!sid || !token || !from) {
    console.warn('[Channel] WhatsApp not configured (missing Twilio credentials)');
    return false;
  }
  const body = formatResponseForChannel('whatsapp', text);
  const form = new URLSearchParams();
  form.set('To', to.startsWith('whatsapp:') ? to : `whatsapp:${to}`);
  form.set('From', from);
  form.set('Body', (body.body as string) || text);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(sid + ':' + token).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[Channel] Twilio error:', res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Channel] WhatsApp send error:', err);
    return false;
  }
}

export async function sendFacebookReply(
  recipientId: string,
  text: string,
  botConfig?: FacebookConfig,
  options?: { quickReplies?: string[] }
): Promise<boolean> {
  const token = botConfig?.pageAccessToken;
  if (!token) {
    console.warn('[Channel] Facebook not configured (missing page access token)');
    return false;
  }
  const payload = formatResponseForChannel('facebook', text, { quickReplies: options?.quickReplies });
  const body: Record<string, unknown> = {
    recipient: { id: recipientId },
    message: payload,
  };
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[Channel] Facebook API error:', res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Channel] Facebook send error:', err);
    return false;
  }
}

export async function sendSlackReply(
  channelId: string,
  text: string,
  botConfig?: SlackConfig,
  threadTs?: string
): Promise<boolean> {
  const token = botConfig?.botToken;
  if (!token) {
    console.warn('[Channel] Slack not configured (missing bot token)');
    return false;
  }
  const payload = formatResponseForChannel('slack', text);
  const body: Record<string, unknown> = {
    channel: channelId,
    text: payload.text || text,
  };
  if (threadTs) body.thread_ts = threadTs;
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      console.error('[Channel] Slack API error:', data.error ?? res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Channel] Slack send error:', err);
    return false;
  }
}
