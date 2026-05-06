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

export async function getBookWithVector(workId: string): Promise<{ book: Book; vector: number[] } | null> {
  const qdrant = await getQdrantClient();
  const results = await qdrant.retrieve(config.qdrantCollectionBooks, {
    ids: [pointId(workId)],
    with_vector: true,
    with_payload: true,
  });
  const hit = results[0];
  if (!hit) return null;
  const vector = Array.isArray(hit.vector) ? (hit.vector as number[]) : null;
  if (!vector) return null;
  return { book: hit.payload as unknown as Book, vector };
}

type ScrollOffset = number | string | null | undefined;

function nextOffset(raw: unknown): ScrollOffset {
  if (raw === null || raw === undefined) return raw as null | undefined;
  if (typeof raw === "number" || typeof raw === "string") return raw;
  return undefined;
}

export async function scrollAllBooks(): Promise<Book[]> {
  const qdrant = await getQdrantClient();
  const books: Book[] = [];
  let offset: ScrollOffset = undefined;

  while (true) {
    const response = await qdrant.scroll(config.qdrantCollectionBooks, {
      limit: 250,
      with_payload: true,
      with_vector: false,
      ...(offset !== undefined ? { offset } : {}),
    });

    for (const point of response.points) {
      if (point.payload) {
        books.push(point.payload as unknown as Book);
      }
    }

    offset = nextOffset(response.next_page_offset);
    if (offset === null || offset === undefined) break;
  }

  return books;
}

export async function getBooksByAuthor(authorName: string): Promise<Book[]> {
  const qdrant = await getQdrantClient();
  const books: Book[] = [];
  let offset: ScrollOffset = undefined;

  while (true) {
    const response = await qdrant.scroll(config.qdrantCollectionBooks, {
      filter: {
        must: [{ key: "author", match: { value: authorName } }],
      },
      limit: 100,
      with_payload: true,
      with_vector: false,
      ...(offset !== undefined ? { offset } : {}),
    });

    for (const point of response.points) {
      if (point.payload) {
        books.push(point.payload as unknown as Book);
      }
    }

    offset = nextOffset(response.next_page_offset);
    if (offset === null || offset === undefined) break;
  }

  return books;
}
