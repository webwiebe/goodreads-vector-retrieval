import type { FastifyInstance } from "fastify";
import { getBookWithVector, searchBooks } from "../../rag/vector-store.js";
import { sessionLog } from "../../lib/session-logger.js";

export async function bookDetailRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/books/:workId", async (request, reply) => {
    const { workId } = request.params as { workId: string };
    const sessionId = request.headers["x-session-id"] as string | undefined;

    try {
      const result = await getBookWithVector(workId);
      if (!result) {
        return reply.status(404).send({ error: "Book not found" });
      }

      const { book, vector } = result;
      const t0 = Date.now();
      const searchResults = await searchBooks(vector, 13);
      const similar = searchResults
        .filter((r) => r.book.work_id !== workId)
        .slice(0, 12)
        .map((r) => r.book);

      if (sessionId) {
        sessionLog(sessionId, "vector-query", {
          query: `similar to: ${book.title}`,
          topK: 13,
          durationMs: Date.now() - t0,
          resultCount: similar.length,
          topResults: similar.slice(0, 3).map((b) => ({ title: b.title, author: b.author })),
        });
      }

      return reply.send({ book, similar });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return reply.status(500).send({ error: message });
    }
  });
}
