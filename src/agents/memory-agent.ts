import { embedText } from "../rag/embeddings.js";
import { searchBooks } from "../rag/vector-store.js";
import { sessionLog } from "../lib/session-logger.js";
import { config } from "../config.js";
import type { SearchResult } from "../types/index.js";

const SCORE_THRESHOLD = 0.3;
const DEFAULT_TOP_K = 20;

function scoreStats(results: SearchResult[]) {
  if (results.length === 0) return undefined;
  const scores = results.map((r) => r.score);
  const sorted = [...scores].sort((a, b) => b - a);
  const mean = scores.reduce((s, x) => s + x, 0) / scores.length;
  return {
    max: Math.round(sorted[0] * 1000) / 1000,
    min: Math.round(sorted[sorted.length - 1] * 1000) / 1000,
    mean: Math.round(mean * 1000) / 1000,
    p75: Math.round(sorted[Math.floor(sorted.length * 0.25)] * 1000) / 1000,
  };
}

export async function searchMemory(
  query: string,
  topK = DEFAULT_TOP_K,
  sessionId?: string
): Promise<SearchResult[]> {
  const t0 = Date.now();
  const vector = await embedText(query);
  const all = await searchBooks(vector, topK);
  const results = all.filter((r) => r.score > SCORE_THRESHOLD);

  if (sessionId) {
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const keywordMatches = results.filter((r) =>
      queryWords.some(
        (w) =>
          r.book.title.toLowerCase().includes(w) ||
          r.book.genres.toLowerCase().includes(w) ||
          r.book.author.toLowerCase().includes(w)
      )
    );

    sessionLog(sessionId, "vector-query", {
      query: query.slice(0, 200),
      embeddingModel: config.embeddingModel,
      embeddingDimensions: config.embeddingDimension,
      topK,
      scoreThreshold: SCORE_THRESHOLD,
      durationMs: Date.now() - t0,
      candidatesBeforeFilter: all.length,
      resultCount: results.length,
      scoreDistribution: scoreStats(results),
      keywordMatchCount: keywordMatches.length,
      semanticOnlyCount: results.length - keywordMatches.length,
      topResults: results.slice(0, 6).map((r) => ({
        title: r.book.title,
        author: r.book.author,
        score: Math.round(r.score * 1000) / 1000,
        genres: r.book.genres.split(",").slice(0, 3).join(", ").trim(),
        matchedByKeyword: queryWords.some((w) =>
          r.book.title.toLowerCase().includes(w)
        ),
      })),
    });
  }

  return results;
}
