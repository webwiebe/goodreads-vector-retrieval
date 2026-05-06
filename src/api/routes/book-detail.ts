import type { FastifyInstance } from "fastify";
import { getBookWithVector, searchBooks } from "../../rag/vector-store.js";

export async function bookDetailRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/books/:workId", async (request, reply) => {
    const { workId } = request.params as { workId: string };

    try {
      const result = await getBookWithVector(workId);
      if (!result) {
        return reply.status(404).send({ error: "Book not found" });
      }

      const { book, vector } = result;
      const searchResults = await searchBooks(vector, 13);
      const similar = searchResults
        .filter((r) => r.book.work_id !== workId)
        .slice(0, 12)
        .map((r) => r.book);

      return reply.send({ book, similar });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return reply.status(500).send({ error: message });
    }
  });
}
