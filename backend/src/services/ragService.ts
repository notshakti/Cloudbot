/**
 * RAG (Retrieval Augmented Generation) - fetches relevant KB chunks for a query.
 * Used by LLM Brain. Uses existing KB chunks + keyword/fuzzy match (no vector DB required).
 */

import mongoose from 'mongoose';
import { KnowledgeBase } from '../models/KnowledgeBase';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getWords(s: string, minLen = 2): string[] {
  return s.split(/\s+/).filter((w) => w.length >= minLen);
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

const WORD_MATCH_THRESHOLD = 0.75;

export interface RelevantChunk {
  id: string;
  text: string;
  title?: string;
  score: number;
}

export async function getRelevantKnowledgeChunks(
  botId: string,
  query: string,
  limit: number = 5
): Promise<RelevantChunk[]> {
  const botIdObj = new mongoose.Types.ObjectId(botId);
  const normalizedQuery = normalize(query);
  const queryWords = getWords(normalizedQuery);

  const items = await KnowledgeBase.find({
    botId: botIdObj,
    isActive: true,
    'processing.status': 'completed',
  })
    .select('content.chunks metadata.title')
    .lean();

  const scored: RelevantChunk[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const chunks = item.content?.chunks || [];
    const title = (item.metadata?.title as string) || '';
    for (let i = 0; i < chunks.length; i++) {
      const ch = chunks[i];
      const text = (ch?.text || '').toLowerCase();
      const chunkWords = getWords(text.replace(/[^\w\s]/g, ' '));
      let matchCount = 0;
      for (const qw of queryWords) {
        const found =
          text.includes(qw) || chunkWords.some((cw) => similarity(qw, cw) >= WORD_MATCH_THRESHOLD);
        if (found) matchCount++;
      }
      const score = queryWords.length > 0 ? matchCount / queryWords.length : 0;
      if (score > 0) {
        const id = `${(item as { _id: mongoose.Types.ObjectId })._id}-${i}`;
        if (!seen.has(id)) {
          seen.add(id);
          scored.push({
            id,
            text: (ch?.text || '').slice(0, 1200),
            title: title || undefined,
            score,
          });
        }
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
