/**
 * Channel-specific response formatting.
 * Converts bot response text (and optional quick replies) into the payload shape expected by each channel.
 */

export type ChannelType = 'web' | 'whatsapp' | 'facebook' | 'slack';

export interface FormatOptions {
  quickReplies?: string[];
  title?: string;
}

export function formatResponseForChannel(
  channel: ChannelType,
  text: string,
  options: FormatOptions = {}
): Record<string, unknown> {
  switch (channel) {
    case 'web':
      return { text, quickReplies: options.quickReplies };
    case 'whatsapp':
      // WhatsApp (Twilio): plain text; optional buttons via template – we keep it simple
      return { body: text };
    case 'facebook':
      // Messenger: text + optional quick_replies
      const payload: Record<string, unknown> = { text };
      if (options.quickReplies && options.quickReplies.length > 0) {
        payload.quick_replies = options.quickReplies.slice(0, 13).map((title) => ({
          content_type: 'text',
          title: title.length > 20 ? title.slice(0, 17) + '...' : title,
          payload: title,
        }));
      }
      return payload;
    case 'slack':
      // Slack: mrkdwn by default; escape specials for plain text
      const slackText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return { text: slackText };
    default:
      return { text };
  }
}
