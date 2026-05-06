import type { FastifyInstance } from "fastify";
import { getBooksByAuthor, getBookWithVector, searchBooks } from "../../rag/vector-store.js";
import type { Book } from "../../types/index.js";

function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const sum = new Array<number>(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      sum[i] += vec[i];
    }
  }
  return sum.map((v) => v / vectors.length);
}

export async function authorRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/authors/:name", async (request, reply) => {
    const { name } = request.params as { name: string };
    const authorName = decodeURIComponent(name);

    try {
      const books = await getBooksByAuthor(authorName);
      if (books.length === 0) {
        return reply.status(404).send({ error: "Author not found" });
      }

      const sampleBooks = books.slice(0, 5);
      const vectorResults = await Promise.all(
        sampleBooks.map((b) => getBookWithVector(b.work_id))
      );
      const vectors = vectorResults
        .filter((r): r is { book: Book; vector: number[] } => r !== null)
        .map((r) => r.vector);

      const similarAuthors: { author: string; sampleBook: Book }[] = [];

      if (vectors.length > 0) {
        const avgVector = averageVectors(vectors);
        const searchResults = await searchBooks(avgVector, 30);
        const seen = new Set<string>();

        for (const result of searchResults) {
          const candidate = result.book.author;
          if (candidate === authorName || seen.has(candidate)) continue;
          seen.add(candidate);
          similarAuthors.push({ author: candidate, sampleBook: result.book });
          if (similarAuthors.length >= 5) break;
        }
      }

      return reply.send({ author: authorName, books, similarAuthors });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return reply.status(500).send({ error: message });
    }
  });
}
