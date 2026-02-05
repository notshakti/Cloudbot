/**
 * RAG Vector Service – 100% FREE pipeline: document → chunks → embeddings (Gemini) → Qdrant;
 * query → query embedding → similarity search → context → Groq LLM answer.
 */

import Groq from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import * as vectorDB from './vectorDB.service';
import * as embedding from './embedding.service';
import { processDocumentForRag, type RagChunk } from './documentProcessorRag';

const GROQ_MODEL = 'llama-3.1-70b-versatile';

export interface ProcessAndStoreResult {
  success: boolean;
  message: string;
  stats: {
    totalChunks: number;
    totalCharacters: number;
    documentTitle: string;
    processingTime: number;
  };
}

export interface AnswerResult {
  answer: string;
  sources: Array<{ text: string; score: number; source: string }>;
  confidence: number;
  tokensUsed: number;
  model: string;
}

/**
 * Process document (file or URL) and store chunks + embeddings in Qdrant.
 */
export async function processAndStoreDocument(
  botId: string,
  file: Express.Multer.File | null,
  url: string | null,
  documentId?: string
): Promise<ProcessAndStoreResult> {
  const docId = documentId || uuidv4();
  const start = Date.now();

  if (!vectorDB.isVectorDBAvailable() || !embedding.isEmbeddingAvailable()) {
    throw new Error('QDRANT and GEMINI_API_KEY must be set for RAG document upload');
  }

  await vectorDB.createBotCollection(botId);

  const { chunks, totalChunks, totalCharacters, documentTitle } = await processDocumentForRag(
    botId,
    docId,
    file ? { ...file, buffer: file.buffer } : null,
    url || null
  );

  const texts = chunks.map((c) => c.text);
  const embeddings = await embedding.generateBatchEmbeddings(texts);

  const chunksWithEmbeddings: vectorDB.ChunkWithEmbedding[] = chunks.map((chunk: RagChunk, i: number) => ({
    text: chunk.text,
    embedding: embeddings[i],
    metadata: chunk.metadata as Record<string, unknown>,
  }));

  await vectorDB.storeChunks(botId, chunksWithEmbeddings);

  const processingTime = Date.now() - start;
  return {
    success: true,
    message: `Processed ${documentTitle}`,
    stats: { totalChunks, totalCharacters, documentTitle, processingTime },
  };
}

/**
 * Answer user question using RAG: vector search + Groq LLM.
 */
export async function answerQuestion(
  botId: string,
  userQuestion: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  options: { maxChunks?: number; minScore?: number; temperature?: number; maxTokens?: number } = {}
): Promise<AnswerResult> {
  const maxChunks = options.maxChunks ?? 5;
  const minScore = options.minScore ?? 0.7;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 1000;

  if (!vectorDB.isVectorDBAvailable() || !embedding.isEmbeddingAvailable()) {
    return {
      answer: "RAG is not configured. Set QDRANT_URL, QDRANT_API_KEY, and GEMINI_API_KEY.",
      sources: [],
      confidence: 0,
      tokensUsed: 0,
      model: 'none',
    };
  }

  const queryEmbedding = await embedding.generateQueryEmbedding(userQuestion);
  const relevantChunks = await vectorDB.searchSimilar(botId, queryEmbedding, maxChunks, minScore);

  if (relevantChunks.length === 0) {
    return {
      answer:
        "I don't have information about that in my knowledge base. Upload relevant documents or ask about topics I've been trained on.",
      sources: [],
      confidence: 0.3,
      tokensUsed: 0,
      model: 'none',
    };
  }

  const context = buildContext(relevantChunks);
  const groqKey = config.groq.apiKey;
  if (!groqKey) {
    return {
      answer: "Answer generation is not configured. Set GROQ_API_KEY for RAG answers.",
      sources: relevantChunks.map((c) => ({ text: c.text.slice(0, 200) + '...', score: c.score, source: String(c.metadata?.source || '') })),
      confidence: 0.8,
      tokensUsed: 0,
      model: 'none',
    };
  }

  const groq = new Groq({ apiKey: groqKey });
  const systemPrompt = `You are an AI assistant. Answer questions using ONLY the provided context from the knowledge base.

RULES:
1. Use ONLY information from the CONTEXT below.
2. If the context doesn't contain the answer, say "I don't have that information in my knowledge base."
3. Be specific and cite which source you used when possible.
4. Be conversational but accurate. Keep answers concise (2-3 paragraphs max).
5. Do not make up facts not in the context.

${context}`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userQuestion },
  ];

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  });

  const answer = completion.choices[0]?.message?.content?.trim() || 'Unable to generate answer.';
  const tokensUsed = completion.usage?.total_tokens ?? 0;
  const avgScore = relevantChunks.reduce((s, c) => s + c.score, 0) / relevantChunks.length;
  const confidence = Math.min(avgScore * 1.2, 1);

  return {
    answer,
    sources: relevantChunks.map((c) => ({
      text: c.text.slice(0, 200) + (c.text.length > 200 ? '...' : ''),
      score: c.score,
      source: String(c.metadata?.source ?? ''),
    })),
    confidence,
    tokensUsed,
    model: GROQ_MODEL,
  };
}

function buildContext(
  chunks: Array<{ text: string; score: number; metadata: { source?: string } }>
): string {
  let out = 'RELEVANT INFORMATION FROM KNOWLEDGE BASE:\n\n';
  chunks.forEach((c, i) => {
    out += `[Source ${i + 1}: ${c.metadata?.source ?? 'unknown'}]\n${c.text}\n\n`;
  });
  return out;
}

/**
 * Get vector knowledge base stats for a bot.
 */
export async function getKnowledgeBaseStats(botId: string): Promise<{
  totalChunks: number;
  collectionSizeMb: string;
} | null> {
  if (!vectorDB.isVectorDBAvailable()) return null;
  try {
    const stats = await vectorDB.getCollectionStats(botId);
    const points = stats.points_count ?? 0;
    const sizeMb = ((points * 768 * 4) / 1024 / 1024).toFixed(2);
    return { totalChunks: points, collectionSizeMb: `${sizeMb} MB` };
  } catch {
    return { totalChunks: 0, collectionSizeMb: '0 MB' };
  }
}
