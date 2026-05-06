import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getTopGenres, getBooksInGenre, isGenreIndexReady } from "../../rag/genre-index.js";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(30),
});

const genreQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export async function genreRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/genres", async (request, reply) => {
    const parseResult = listQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }
    const { limit } = parseResult.data;
    const genres = getTopGenres(limit);
    return reply.send({ genres });
  });

  fastify.get("/genres/:name/top", async (request, reply) => {
    const { name } = request.params as { name: string };
    const parseResult = genreQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    if (!isGenreIndexReady()) {
      return reply.status(404).send({ error: "Genre index not ready" });
    }

    const { limit } = parseResult.data;
    const decoded = decodeURIComponent(name);
    const books = getBooksInGenre(decoded, limit);
    if (books.length === 0) {
      return reply.status(404).send({ error: "Genre not found" });
    }

    return reply.send({ genre: decoded, books });
  });
}
