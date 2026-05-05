import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "../config.js";
import type { Book, SearchResult } from "../types/index.js";

export interface BookPoint {
  book: Book;
  vector: number[];
}

let client: QdrantClient | null = null;

export async function getQdrantClient(): Promise<QdrantClient> {
  if (!client) {
    client = new QdrantClient({
      url: config.qdrantUrl,
      ...(config.qdrantApiKey ? { apiKey: config.qdrantApiKey } : {}),
    });
  }
  return client;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pointId(work_id: string): number {
  return parseInt(work_id, 10) || hashCode(work_id);
}

export async function ensureCollection(): Promise<void> {
  const qdrant = await getQdrantClient();
  const { exists } = await qdrant.collectionExists(config.qdrantCollectionBooks);
  if (!exists) {
    await qdrant.createCollection(config.qdrantCollectionBooks, {
      vectors: { size: config.embeddingDimension, distance: "Cosine" },
    });
  }
}

export async function upsertBooks(books: BookPoint[]): Promise<void> {
  if (books.length === 0) return;
  const qdrant = await getQdrantClient();
  const points = books.map(({ book, vector }) => ({
    id: pointId(book.work_id),
    vector,
    payload: book as unknown as Record<string, unknown>,
  }));
  await qdrant.upsert(config.qdrantCollectionBooks, { wait: true, points });
}

export async function searchBooks(queryVector: number[], topK: number): Promise<SearchResult[]> {
  const qdrant = await getQdrantClient();
  const result = await qdrant.search(config.qdrantCollectionBooks, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
  });
  return result.map((hit) => ({
    book: hit.payload as unknown as Book,
    score: hit.score,
  }));
}

export async function getCollectionCount(): Promise<number> {
  const qdrant = await getQdrantClient();
  try {
    const info = await qdrant.getCollection(config.qdrantCollectionBooks);
    return info.points_count ?? 0;
  } catch {
    return 0;
  }
}
