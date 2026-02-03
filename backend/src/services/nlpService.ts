import mongoose from 'mongoose';
import { Bot } from '../models/Bot';
import { Intent } from '../models/Intent';
import { KnowledgeBase } from '../models/KnowledgeBase';
import { UnrecognizedQuery } from '../models/UnrecognizedQuery';

const FUZZY_WORD_THRESHOLD = 0.75; // min similarity for a word to count as matched (e.g. cources→courses)
const FUZZY_INTENT_THRESHOLD = 0.5; // min overall score to accept an intent

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein distance between two strings. */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

/** Similarity ratio 0..1 (1 = identical). */
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const d = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - d / maxLen;
}

const STOPWORDS = new Set(
  'a an are be do does did the this that those these is it its of or and for to in on at by with from as'.split(/\s+/)
);

/** Words from normalized string, optional filter of very short words and stopwords. */
function getWords(normalized: string, minLen = 1, dropStopwords = false): string[] {
  let words = normalized.split(/\s+/).filter((w) => w.length >= minLen);
  if (dropStopwords) words = words.filter((w) => !STOPWORDS.has(w));
  return words;
}

/**
 * Score how well input words match phrase words using fuzzy similarity.
 * Returns a value in [0, 1]: fraction of input words that have a "close enough" match in the phrase.
 */
function wordOverlapScore(inputWords: string[], phraseWords: string[]): number {
  if (inputWords.length === 0) return 0;
  let matched = 0;
  for (const iw of inputWords) {
    if (phraseWords.some((pw) => stringSimilarity(iw, pw) >= FUZZY_WORD_THRESHOLD)) matched++;
  }
  return matched / inputWords.length;
}

/**
 * Best fuzzy score of input against a single training phrase: word overlap and/or full-string similarity.
 * Uses content words (no stopwords) so "what are the cources availabe" scores well against "courses available".
 */
function phraseMatchScore(normalizedInput: string, phraseNorm: string): number {
  const inputWords = getWords(normalizedInput, 2, true);
  const phraseWords = getWords(phraseNorm, 2, true);
  const overlap =
    inputWords.length > 0
      ? wordOverlapScore(inputWords, phraseWords)
      : wordOverlapScore(getWords(normalizedInput, 2), getWords(phraseNorm, 2));
  const fullSimilarity = stringSimilarity(normalizedInput, phraseNorm);
  return Math.max(overlap, fullSimilarity);
}

export interface BotResponseResult {
  response: { text: string };
  intent: string | null;
  confidence: number;
  source: 'intent' | 'knowledge_base' | 'fallback';
  title?: string;
}

export async function getBotResponse(
  botId: string,
  message: string
): Promise<BotResponseResult> {
  const bot = await Bot.findById(botId);
  if (!bot) throw new Error('Bot not found');

  const normalizedInput = normalizeForMatch(message);
  const botIdObj = new mongoose.Types.ObjectId(botId);

  // 1. Intent match (exact/substring first, then fuzzy for typos and variations)
  const intents = await Intent.find({ botId: botIdObj, isActive: true }).sort({ priority: -1 });
  let bestIntent: { intent: typeof intents[0]; confidence: number } | null = null;

  for (const intent of intents) {
    for (const phrase of intent.trainingPhrases || []) {
      const phraseNorm = normalizeForMatch(phrase.text);
      // Exact or substring match
      if (
        phraseNorm === normalizedInput ||
        normalizedInput.includes(phraseNorm) ||
        phraseNorm.includes(normalizedInput)
      ) {
        const confidence = phraseNorm === normalizedInput ? 1 : 0.9;
        if (!bestIntent || confidence > bestIntent.confidence) {
          bestIntent = { intent, confidence };
        }
        break;
      }
      // Fuzzy match (typos, "cources" -> "courses", "availabe" -> "available")
      const score = phraseMatchScore(normalizedInput, phraseNorm);
      if (score >= FUZZY_INTENT_THRESHOLD && (!bestIntent || score > bestIntent.confidence)) {
        bestIntent = { intent, confidence: Math.min(score, 0.88) };
      }
    }
  }

  if (bestIntent) {
    const response = bestIntent.intent.responses?.[0];
    let text = response?.text ?? 'No response configured.';
    const variations = (response as { variations?: string[] })?.variations;
    if (Array.isArray(variations) && variations.length > 0) {
      const options = [text, ...variations];
      text = options[Math.floor(Math.random() * options.length)];
    }
    return {
      response: { text },
      intent: bestIntent.intent.name,
      confidence: bestIntent.confidence,
      source: 'intent',
    };
  }

  // 2. Knowledge base (fuzzy word match so "cources" matches chunks with "courses")
  const kbItems = await KnowledgeBase.find({
    botId: botIdObj,
    isActive: true,
    'processing.status': 'completed',
  }).select('content.chunks metadata.title');
  const inputWords = getWords(normalizedInput, 2);
  for (const item of kbItems) {
    const chunks = item.content?.chunks || [];
    for (const ch of chunks) {
      const chunkText = (ch.text || '').toLowerCase();
      const chunkWords = getWords(chunkText.replace(/[^\w\s]/g, ' '), 2);
      let matchCount = 0;
      for (const iw of inputWords) {
        const found =
          chunkText.includes(iw) ||
          chunkWords.some((cw) => stringSimilarity(iw, cw) >= FUZZY_WORD_THRESHOLD);
        if (found) matchCount++;
      }
      const minMatch = Math.min(2, inputWords.length);
      if (matchCount >= minMatch || (inputWords.length === 1 && matchCount === 1)) {
        const snippet = (ch.text || '').slice(0, 400);
        return {
          response: { text: snippet },
          intent: null,
          confidence: 0.7,
          source: 'knowledge_base',
          title: item.metadata?.title,
        };
      }
    }
  }

  // 3. Log unrecognized + fallback
  const trimmed = message.trim();
  if (trimmed) {
    const existing = await UnrecognizedQuery.findOne({ botId: botIdObj, text: trimmed, status: 'pending' });
    if (existing) {
      await UnrecognizedQuery.findByIdAndUpdate(existing._id, {
        $inc: { count: 1 },
        lastSeenAt: new Date(),
      });
    } else {
      await UnrecognizedQuery.create({ botId: botIdObj, text: trimmed, status: 'pending' });
    }
  }
  const fallbackMessages = bot.config?.fallbackMessages || [
    "I'm not sure I understood. Could you rephrase?",
  ];
  const text = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
  return {
    response: { text },
    intent: null,
    confidence: 0,
    source: 'fallback',
  };
}
