import { embedText } from "../rag/embeddings.js";
import { searchBooks } from "../rag/vector-store.js";
import { sessionLog } from "../lib/session-logger.js";
import type { SearchResult } from "../types/index.js";

const SCORE_THRESHOLD = 0.3;

export async function searchMemory(query: string, topK = 10, sessionId?: string): Promise<SearchResult[]> {
  const t0 = Date.now();
  const vector = await embedText(query);
  const results = await searchBooks(vector, topK);
  const filtered = results.filter((r) => r.score > SCORE_THRESHOLD);

  if (sessionId) {
    sessionLog(sessionId, "vector-query", {
      query: query.slice(0, 200),
      topK,
      durationMs: Date.now() - t0,
      resultCount: filtered.length,
      topResults: filtered.slice(0, 5).map((r) => ({
        title: r.book.title,
        author: r.book.author,
        score: Math.round(r.score * 1000) / 1000,
      })),
    });
  }

  return filtered;
}
