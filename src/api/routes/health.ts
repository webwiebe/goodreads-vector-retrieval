import type { FastifyInstance } from "fastify";
import { getCollectionCount } from "../../rag/vector-store.js";
import { getIngestionStatus } from "../../rag/ingestion.js";

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/health", async (_request, reply) => {
    let qdrantConnected = false;
    let indexedBooks = 0;

    try {
      indexedBooks = await getCollectionCount();
      qdrantConnected = true;
    } catch {
      qdrantConnected = false;
    }

    const ingestionStatus = getIngestionStatus();

    return reply.send({
      status: "ok",
      qdrant: qdrantConnected,
      ingestionComplete: ingestionStatus.complete,
      indexedBooks,
    });
  });
}
