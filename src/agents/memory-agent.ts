import { embedText } from "../rag/embeddings.js";
import { searchBooks } from "../rag/vector-store.js";
import type { SearchResult } from "../types/index.js";

const SCORE_THRESHOLD = 0.3;

export async function searchMemory(query: string, topK = 10): Promise<SearchResult[]> {
  const vector = await embedText(query);
  const results = await searchBooks(vector, topK);
  return results.filter((r) => r.score > SCORE_THRESHOLD);
}
