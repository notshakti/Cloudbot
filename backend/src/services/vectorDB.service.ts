/**
 * Vector DB service – Qdrant Cloud (FREE tier).
 * One collection per bot: bot_<botId>. Vectors: 768 dimensions (Gemini text-embedding-004).
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const COLLECTION_PREFIX = 'bot_';
const VECTOR_SIZE = 768; // Gemini text-embedding-004

let client: QdrantClient | null = null;

function getClient(): QdrantClient {
  if (!config.qdrant.url || !config.qdrant.apiKey) {
    throw new Error('QDRANT_URL and QDRANT_API_KEY must be set for vector RAG');
  }
  if (!client) {
    client = new QdrantClient({
      url: config.qdrant.url,
      apiKey: config.qdrant.apiKey,
      // Cloud clusters can occasionally fail version checks on cold start / restricted networks.
      // We only need basic REST operations; skip compatibility check and use a shorter timeout.
      checkCompatibility: false,
      timeout: 30000,
    });
  }
  return client;
}

export function isVectorDBAvailable(): boolean {
  return !!(config.qdrant.url && config.qdrant.apiKey);
}

export async function createBotCollection(botId: string): Promise<void> {
  const c = getClient();
  const collectionName = `${COLLECTION_PREFIX}${botId}`;

  try {
    const collections = await c.getCollections();
    const exists = collections.collections.some((col) => col.name === collectionName);
    if (exists) return;

    await c.createCollection(collectionName, {
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine',
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      replication_factor: 1,
    });
    console.log(`[VectorDB] Created collection for bot: ${botId}`);
  } catch (err) {
    console.error('[VectorDB] Error creating collection:', err);
    throw err;
  }
}

export interface ChunkWithEmbedding {
  text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export async function storeChunks(
  botId: string,
  chunks: ChunkWithEmbedding[]
): Promise<void> {
  const c = getClient();
  const collectionName = `${COLLECTION_PREFIX}${botId}`;

  const points = chunks.map((chunk) => ({
    id: uuidv4(),
    vector: chunk.embedding,
    payload: {
      text: chunk.text,
      ...chunk.metadata,
      botId,
      createdAt: new Date().toISOString(),
    },
  }));

  await c.upsert(collectionName, {
    wait: true,
    points,
  });
  console.log(`[VectorDB] Stored ${chunks.length} chunks for bot ${botId}`);
}

export interface SimilarChunk {
  text: string;
  score: number;
  metadata: { source?: string; documentId?: string; chunkIndex?: number; title?: string };
}

export async function searchSimilar(
  botId: string,
  queryEmbedding: number[],
  limit: number = 5,
  minScore: number = 0.7
): Promise<SimilarChunk[]> {
  const c = getClient();
  const collectionName = `${COLLECTION_PREFIX}${botId}`;

  try {
    const results = await c.search(collectionName, {
      vector: queryEmbedding,
      limit,
      score_threshold: minScore,
      with_payload: true,
    });

    return results.map((r) => ({
      text: (r.payload?.text as string) || '',
      score: r.score ?? 0,
      metadata: {
        source: r.payload?.source as string | undefined,
        documentId: r.payload?.documentId as string | undefined,
        chunkIndex: r.payload?.chunkIndex as number | undefined,
        title: r.payload?.title as string | undefined,
      },
    }));
  } catch (err) {
    console.error('[VectorDB] Search error:', err);
    return [];
  }
}

export async function deleteBotCollection(botId: string): Promise<void> {
  const c = getClient();
  const collectionName = `${COLLECTION_PREFIX}${botId}`;
  await c.deleteCollection(collectionName);
  console.log(`[VectorDB] Deleted collection for bot ${botId}`);
}

export async function getCollectionStats(botId: string): Promise<{
  points_count: number;
}> {
  const c = getClient();
  const collectionName = `${COLLECTION_PREFIX}${botId}`;
  const info = await c.getCollection(collectionName);
  return {
    points_count: info.points_count ?? 0,
  };
}
