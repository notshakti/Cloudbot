/**
 * Message Router – decides whether to use LLM Brain or intent-based NLP.
 * LLM-first: always try LLM, fall back to intent if LLM fails or bot has fallbackToIntent.
 * Hybrid: try intent first; if confidence low, use LLM.
 * Intent-only: current behavior (getBotResponse only).
 */

import { Bot } from '../models/Bot';
import { getBotResponse, BotResponseResult } from './nlpService';
import {
  generateLLMResponse,
  isLLMAvailable,
  LLMContext,
  LLMResponseResult,
} from './llmBrainService';
import { Conversation } from '../models/Conversation';

export type RouteDecision = 'llm_brain' | 'intent_based';

export interface RouterResult {
  response: { text: string };
  intent: string | null;
  confidence: number;
  source: 'intent' | 'knowledge_base' | 'fallback' | 'llm_generation';
  title?: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    documentsUsed?: string[];
  };
}

/**
 * Load conversation history for context (last N messages).
 */
export async function loadConversationContext(
  botId: string,
  sessionId: string,
  maxMessages: number = 10
): Promise<ConversationMessage[]> {
  const conv = await Conversation.findOne({ botId, sessionId }).lean();
  if (!conv || !conv.messages?.length) return [];
  const messages = conv.messages.slice(-maxMessages).map((m) => ({
    sender: m.sender as 'user' | 'bot',
    text: m.text || '',
  }));
  return messages;
}

export interface ConversationMessage {
  sender: 'user' | 'bot';
  text: string;
}

/**
 * Build LLM context from bot and conversation.
 */
export function buildLLMContext(
  bot: { _id: unknown; name?: string; type?: string; description?: string; config?: { tone?: string; welcomeMessage?: string } },
  conversationHistory: ConversationMessage[]
): LLMContext {
  return {
    botId: String(bot._id),
    botName: bot.name || 'Assistant',
    botType: bot.type || 'custom',
    botDescription: bot.description || 'General assistant.',
    tone: bot.config?.tone || 'professional',
    conversationHistory,
    welcomeMessage: bot.config?.welcomeMessage,
  };
}

/**
 * Route a message: use LLM or intent-based response based on bot config.
 */
export async function routeAndRespond(
  botId: string,
  message: string,
  sessionId: string | null
): Promise<RouterResult> {
  const bot = await Bot.findById(botId).lean();
  if (!bot) throw new Error('Bot not found');

  const aiMode = bot.config?.aiMode ?? 'intent_only';
  const aiConfig = bot.config?.aiConfig ?? {};
  const fallbackToIntent = aiConfig.fallbackToIntent !== false;
  const contextWindowSize = aiConfig.contextWindowSize ?? 10;
  const ragEnabled = aiConfig.ragEnabled !== false;

  // Intent-only: current behavior
  if (aiMode === 'intent_only') {
    const result = await getBotResponse(botId, message);
    return mapNlpToRouterResult(result);
  }

  // LLM not configured: fall back to intent
  if (!isLLMAvailable()) {
    const result = await getBotResponse(botId, message);
    return mapNlpToRouterResult(result);
  }

  // Load context for LLM
  const conversationHistory = sessionId
    ? await loadConversationContext(botId, sessionId, contextWindowSize)
    : [];
  const context = buildLLMContext(bot, conversationHistory);

  // LLM-first: always try LLM first
  if (aiMode === 'llm_first') {
    const llmResult = await generateLLMResponse(message, context, {
      ragLimit: ragEnabled ? 5 : 0,
      model: mapBotLLMToModel(aiConfig.primaryLLM),
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens,
    });
    if (llmResult.confidence >= 0.5 || !fallbackToIntent) {
      return mapLLMToRouterResult(llmResult);
    }
    // Low confidence and fallback enabled
    const nlpResult = await getBotResponse(botId, message);
    return mapNlpToRouterResult(nlpResult);
  }

  // Hybrid: try intent first; if low confidence, use LLM
  if (aiMode === 'hybrid') {
    const nlpResult = await getBotResponse(botId, message);
    const threshold = (bot.config?.confidenceThreshold as number) ?? 0.7;
    if (nlpResult.confidence >= threshold && nlpResult.source !== 'fallback') {
      return mapNlpToRouterResult(nlpResult);
    }
    const llmResult = await generateLLMResponse(message, context, {
      ragLimit: ragEnabled ? 5 : 0,
      model: mapBotLLMToModel(aiConfig.primaryLLM),
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens,
    });
    return mapLLMToRouterResult(llmResult);
  }

  // Default: intent
  const result = await getBotResponse(botId, message);
  return mapNlpToRouterResult(result);
}

function mapNlpToRouterResult(r: BotResponseResult): RouterResult {
  return {
    response: r.response,
    intent: r.intent,
    confidence: r.confidence,
    source: r.source,
    title: r.title,
  };
}

function mapLLMToRouterResult(r: LLMResponseResult): RouterResult {
  return {
    response: { text: r.text },
    intent: null,
    confidence: r.confidence,
    source: 'llm_generation',
    metadata: r.metadata,
  };
}

function mapBotLLMToModel(primaryLLM?: string): string {
  switch (primaryLLM) {
    case 'gpt-4':
      return 'gpt-4';
    case 'gpt-4-turbo':
      return 'gpt-4-turbo-preview';
    default:
      return 'gpt-3.5-turbo';
  }
}
