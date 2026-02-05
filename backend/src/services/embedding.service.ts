/**
 * Embedding service – Google Gemini text-embedding-004 (FREE).
 * Used for indexing document chunks and for query embedding in RAG.
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../config';

const EMBEDDING_MODEL = 'text-embedding-004';
const RATE_LIMIT_DELAY_MS = 1100; // ~55/min to stay under 60/min

let genAI: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY must be set for RAG embeddings');
  }
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }
  return genAI;
}

export function isEmbeddingAvailable(): boolean {
  return !!config.gemini.apiKey;
}

/**
 * Generate embedding for a single text (document chunk or query).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || !Array.isArray(values)) {
    throw new Error('Invalid embedding response from Gemini');
  }
  return values;
}

/**
 * Generate embedding for a search query (optional prefix for better retrieval).
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const optimizedQuery = `search_query: ${query}`;
  return generateEmbedding(optimizedQuery);
}

/**
 * Generate embeddings for multiple texts with rate limiting (Gemini free: 60/min).
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    const vec = await generateEmbedding(texts[i]);
    results.push(vec);
    if (i < texts.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS));
    }
  }
  return results;
}
