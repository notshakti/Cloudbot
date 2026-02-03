import { Request, Response } from 'express';
import crypto from 'crypto';
import { Conversation } from '../models/Conversation';
import { Bot } from '../models/Bot';
import { routeAndRespond } from '../services/messageRouter';

function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function startConversation(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { channel, user } = req.body;
    const bot = await Bot.findOne({ _id: botId, status: { $in: ['active', 'draft'] } });
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    const sessionId = generateSessionId();
    const welcomeMessage = bot.config?.welcomeMessage || 'Hello! How can I help you today?';
    const conv = await Conversation.create({
      botId,
      sessionId,
      channel: channel || 'web',
      user: user || undefined,
      messages: [{ sender: 'bot', text: welcomeMessage, timestamp: new Date() }],
      status: 'active',
      startedAt: new Date(),
      lastActivityAt: new Date(),
    });
    res.status(201).json({
      success: true,
      data: {
        sessionId,
        conversationId: conv._id,
        welcomeMessage,
      },
    });
  } catch (err) {
    console.error('[Chat] Start error:', err);
    res.status(500).json({ success: false, message: 'Failed to start conversation' });
  }
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { message, sessionId } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }
    const bot = await Bot.findOne({ _id: botId, status: { $in: ['active', 'draft'] } });
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }

    let conv = sessionId
      ? await Conversation.findOne({ botId, sessionId })
      : null;
    if (sessionId && !conv) {
      res.status(404).json({ success: false, message: 'Session not found. Start a new conversation.' });
      return;
    }
    if (!conv) {
      const newSessionId = generateSessionId();
      const welcomeMessage = bot.config?.welcomeMessage || 'Hello! How can I help you today?';
      conv = await Conversation.create({
        botId,
        sessionId: newSessionId,
        channel: 'web',
        messages: [
          { sender: 'bot', text: welcomeMessage, timestamp: new Date() },
          { sender: 'user', text: message.trim(), timestamp: new Date() },
        ],
        status: 'active',
        startedAt: new Date(),
        lastActivityAt: new Date(),
      });
      const result = await routeAndRespond(botId, message, newSessionId);
      conv.messages.push({
        sender: 'bot',
        text: result.response.text,
        timestamp: new Date(),
        nlp: { intent: result.intent, confidence: result.confidence, source: result.source },
      });
      conv.lastActivityAt = new Date();
      await conv.save();
      res.status(201).json({
        success: true,
        data: {
          sessionId: newSessionId,
          response: result.response,
          intent: result.intent,
          confidence: result.confidence,
          source: result.source,
          metadata: result.metadata,
        },
      });
      return;
    }

    conv.messages.push({ sender: 'user', text: message.trim(), timestamp: new Date() });
    conv.lastActivityAt = new Date();
    await conv.save();

    const result = await routeAndRespond(botId, message, conv.sessionId);
    conv.messages.push({
      sender: 'bot',
      text: result.response.text,
      timestamp: new Date(),
      nlp: { intent: result.intent, confidence: result.confidence, source: result.source },
    });
    conv.lastActivityAt = new Date();
    await conv.save();

    res.json({
      success: true,
      data: {
        sessionId: conv.sessionId,
        response: result.response,
        intent: result.intent,
        confidence: result.confidence,
        source: result.source,
        metadata: result.metadata,
      },
    });
  } catch (err) {
    console.error('[Chat] Message error:', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  try {
    const { botId, sessionId } = req.params;
    const conv = await Conversation.findOne({ botId, sessionId });
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }
    res.json({
      success: true,
      data: {
        sessionId: conv.sessionId,
        status: conv.status,
        messages: conv.messages,
        startedAt: conv.startedAt,
        lastActivityAt: conv.lastActivityAt,
      },
    });
  } catch (err) {
    console.error('[Chat] History error:', err);
    res.status(500).json({ success: false, message: 'Failed to get history' });
  }
}

export async function endConversation(req: Request, res: Response): Promise<void> {
  try {
    const { botId, sessionId } = req.params;
    const conv = await Conversation.findOneAndUpdate(
      { botId, sessionId, status: 'active' },
      { status: 'ended', endedAt: new Date() },
      { new: true }
    );
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }
    res.json({ success: true, data: { sessionId: conv.sessionId, status: 'ended' } });
  } catch (err) {
    console.error('[Chat] End error:', err);
    res.status(500).json({ success: false, message: 'Failed to end conversation' });
  }
}

/**
 * Escalate conversation to human (end-user requests human agent).
 */
export async function escalateConversation(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { sessionId, reason } = req.body;
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'sessionId is required' });
      return;
    }
    const bot = await Bot.findOne({ _id: botId, status: { $in: ['active', 'draft'] } });
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }
    if (!bot.config?.features?.humanHandoff) {
      res.status(400).json({ success: false, message: 'Human handoff is not enabled for this bot' });
      return;
    }
    const conv = await Conversation.findOne({ botId, sessionId });
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }
    conv.status = 'escalated';
    conv.escalation = {
      wasEscalated: true,
      reason: typeof reason === 'string' ? reason : undefined,
      escalatedAt: new Date(),
    };
    conv.lastActivityAt = new Date();
    await conv.save();
    res.json({
      success: true,
      data: {
        sessionId: conv.sessionId,
        status: 'escalated',
        message: 'A human agent will be with you shortly.',
      },
    });
  } catch (err) {
    console.error('[Chat] Escalate error:', err);
    res.status(500).json({ success: false, message: 'Failed to escalate' });
  }
}

/**
 * Dedicated AI message endpoint – always uses LLM + RAG when OPENAI_API_KEY is set.
 * Body: { message, sessionId?, stream?: boolean }
 */
export async function sendAIMessage(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { message, sessionId, stream = false } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }
    const bot = await Bot.findOne({ _id: botId, status: { $in: ['active', 'draft'] } });
    if (!bot) {
      res.status(404).json({ success: false, message: 'Bot not found' });
      return;
    }

    if (stream) {
      res.status(501).json({
        success: false,
        message: 'Streaming not implemented yet. Use stream: false.',
      });
      return;
    }

    const { loadConversationContext, buildLLMContext } = await import(
      '../services/messageRouter'
    );
    const { generateLLMResponse } = await import('../services/llmBrainService');
    const history = sessionId
      ? await loadConversationContext(botId, sessionId, 10)
      : [];
    const context = buildLLMContext(bot, history);
    const aiConfig = bot.config?.aiConfig ?? {};
    const result = await generateLLMResponse(message, context, {
      ragLimit: 5,
      model: aiConfig.primaryLLM === 'gpt-4' ? 'gpt-4' : aiConfig.primaryLLM === 'gpt-4-turbo' ? 'gpt-4-turbo-preview' : 'gpt-3.5-turbo',
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens,
    });

    if (sessionId) {
      const conv = await Conversation.findOne({ botId, sessionId });
      if (conv) {
        conv.messages.push(
          { sender: 'user', text: message.trim(), timestamp: new Date() },
          {
            sender: 'bot',
            text: result.text,
            timestamp: new Date(),
            nlp: { intent: null, confidence: result.confidence, source: 'llm_generation' },
          }
        );
        conv.lastActivityAt = new Date();
        await conv.save();
      }
    }

    res.json({
      success: true,
      data: {
        response: { text: result.text },
        confidence: result.confidence,
        source: result.source,
        suggestedQuestions: [],
        metadata: result.metadata,
      },
    });
  } catch (err) {
    console.error('[Chat] AI message error:', err);
    res.status(500).json({ success: false, message: 'Failed to process AI message' });
  }
}

export async function submitFeedback(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { sessionId, rating, comment } = req.body;
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'sessionId is required' });
      return;
    }
    const conv = await Conversation.findOne({ botId, sessionId });
    if (!conv) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }
    conv.feedback = {
      rating: typeof rating === 'number' ? rating : undefined,
      comment: typeof comment === 'string' ? comment : undefined,
      submittedAt: new Date(),
    };
    await conv.save();
    res.json({ success: true, data: { message: 'Feedback submitted' } });
  } catch (err) {
    console.error('[Chat] Feedback error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
}
