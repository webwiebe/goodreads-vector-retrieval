import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { embedText } from "../../rag/embeddings.js";
import { searchBooks } from "../../rag/vector-store.js";

const searchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function booksRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/books/search", async (request, reply) => {
    const parseResult = searchQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const { q, limit } = parseResult.data;

    try {
      const vector = await embedText(q);
      const results = await searchBooks(vector, limit);
      return reply.send({ results: results.map((r) => r.book) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return reply.status(500).send({ error: message });
    }
  });
}
