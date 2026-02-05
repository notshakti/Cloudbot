/**
 * LLM Brain Service – response generation with RAG.
 * Uses Gemini first, then Groq on failure (both read from env). No OpenAI dependency.
 */

import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { getRelevantKnowledgeChunks, RelevantChunk } from './ragService';
import { isVectorDBAvailable } from './vectorDB.service';
import * as embedding from './embedding.service';
import * as vectorDB from './vectorDB.service';

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const groqApiKey = process.env.GROQ_API_KEY || '';

const gemini = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

export interface ConversationMessage {
  sender: 'user' | 'bot';
  text: string;
}

export interface LLMContext {
  botId: string;
  botName: string;
  botType: string;
  botDescription: string;
  tone: string;
  conversationHistory: ConversationMessage[];
  welcomeMessage?: string;
}

export interface LLMResponseResult {
  text: string;
  confidence: number;
  source: 'llm_generation';
  metadata?: {
    model?: string;
    provider?: 'gemini' | 'groq';
    tokensUsed?: number;
    documentsUsed?: string[];
  };
}

/**
 * Build system prompt for the assistant from bot config + RAG chunks.
 */
function buildSystemPrompt(ctx: LLMContext, knowledgeDocs: RelevantChunk[]): string {
  const kbSection =
    knowledgeDocs.length > 0
      ? `KNOWLEDGE BASE CONTEXT (use this to answer accurately):\n${knowledgeDocs
          .map((d) => (d.title ? `[${d.title}]\n` : '') + d.text)
          .join('\n\n---\n\n')}`
      : "No specific knowledge base documents were retrieved. Answer based on your general knowledge and the bot description, but prefer saying \"I don't have that information in my knowledge base\" if the question is very specific to the organization.";

  const historySection =
    ctx.conversationHistory.length > 0
      ? `RECENT CONVERSATION:\n${ctx.conversationHistory
          .slice(-(ctx.conversationHistory.length))
          .map((m) => `${m.sender}: ${m.text}`)
          .join('\n')}`
      : 'This is the start of the conversation.';

  return `You are an AI assistant for "${ctx.botName}", a ${ctx.botType} chatbot.

Your role: ${ctx.botDescription || 'Help users with their questions.'}
Your tone: ${ctx.tone || 'professional'} (be helpful, accurate, and concise).

${kbSection}

${historySection}

RULES:
1. Answer using the knowledge base above when relevant.
2. If the answer is not in the knowledge base, say so and offer to connect the user with a human if needed.
3. Keep responses concise (2-3 short paragraphs max unless the user asks for detail).
4. Do not make up specific facts (dates, prices, names) not present in the context.
5. If the user needs to book, pay, or submit a form, say so clearly and that they can be connected to the right flow.`;
}

/** Try Gemini; return null on any error so caller can fall back to Groq. */
async function tryGemini(
  systemPrompt: string,
  userMessage: string,
  options: { temperature?: number; maxTokens?: number }
): Promise<LLMResponseResult | null> {
  if (!gemini) return null;
  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 500,
      },
    });
    const text = (response as { text?: string })?.text?.trim();
    if (!text) return null;
    return {
      text,
      confidence: 0.95,
      source: 'llm_generation',
      metadata: { model: 'gemini-2.0-flash', provider: 'gemini' },
    };
  } catch (err) {
    console.error('[LLMBrain] Gemini error:', err);
    return null;
  }
}

/** Try Groq; return null on any error. */
async function tryGroq(
  systemPrompt: string,
  userMessage: string,
  options: { temperature?: number; maxTokens?: number }
): Promise<LLMResponseResult | null> {
  if (!groq) return null;
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 500,
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return null;
    const tokensUsed = (completion as { usage?: { total_tokens?: number } })?.usage?.total_tokens;
    return {
      text: content,
      confidence: 0.95,
      source: 'llm_generation',
      metadata: {
        model: 'llama-3.3-70b-versatile',
        provider: 'groq',
        tokensUsed,
      },
    };
  } catch (err) {
    console.error('[LLMBrain] Groq error:', err);
    return null;
  }
}

/**
 * Get RAG context: use vector DB (Qdrant) when configured, else MongoDB keyword chunks.
 */
async function getRagChunks(botId: string, query: string, limit: number): Promise<RelevantChunk[]> {
  if (isVectorDBAvailable() && embedding.isEmbeddingAvailable()) {
    try {
      const queryEmbedding = await embedding.generateQueryEmbedding(query);
      const similar = await vectorDB.searchSimilar(botId, queryEmbedding, limit, 0.5);
      return similar.map((s, i) => ({
        id: `vec-${i}-${s.metadata?.source ?? 'doc'}`,
        text: s.text,
        title: s.metadata?.title as string | undefined,
        score: s.score,
      }));
    } catch (err) {
      console.error('[LLMBrain] Vector RAG fallback to KB:', err);
    }
  }
  return getRelevantKnowledgeChunks(botId, query, limit);
}

/**
 * Generate a response using Gemini first, then Groq on failure. RAG is always used for context.
 * When Qdrant is configured, vector RAG is used; otherwise MongoDB knowledge base chunks.
 */
export async function generateLLMResponse(
  userMessage: string,
  context: LLMContext,
  options?: {
    ragLimit?: number;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<LLMResponseResult> {
  const ragLimit = options?.ragLimit ?? 5;
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 500;

  if (!gemini && !groq) {
    return {
      text: "No AI provider is configured. Set GEMINI_API_KEY or GROQ_API_KEY in your .env to enable intelligent responses.",
      confidence: 0,
      source: 'llm_generation',
      metadata: {},
    };
  }

  const knowledgeDocs = await getRagChunks(context.botId, userMessage, ragLimit);

  const systemPrompt = buildSystemPrompt(context, knowledgeDocs);
  const metaBase = {
    documentsUsed: knowledgeDocs.map((d) => d.id),
  };

  let result: LLMResponseResult | null = null;

  if (gemini) {
    result = await tryGemini(systemPrompt, userMessage, { temperature, maxTokens });
    if (result) {
      result.metadata = { ...result.metadata, ...metaBase };
      return result;
    }
  }

  if (groq) {
    result = await tryGroq(systemPrompt, userMessage, { temperature, maxTokens });
    if (result) {
      result.metadata = { ...result.metadata, ...metaBase };
      return result;
    }
  }

  return {
    text: "I'm having trouble processing that right now. Please try again or ask to speak with a human agent.",
    confidence: 0.3,
    source: 'llm_generation',
    metadata: {},
  };
}

/**
 * Check if at least one LLM provider is available.
 */
export function isLLMAvailable(): boolean {
  return !!gemini || !!groq;
}
