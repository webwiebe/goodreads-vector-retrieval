import type { FastifyInstance } from "fastify";
import { getSessionLogs, subscribeSession } from "../../lib/session-logger.js";

export async function logsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/logs/stream", async (request, reply) => {
    const { sessionId } = request.query as { sessionId?: string };

    if (!sessionId) {
      return reply.status(400).send({ error: "sessionId is required" });
    }

    reply.hijack();

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    for (const entry of getSessionLogs(sessionId)) {
      reply.raw.write(`data: ${JSON.stringify(entry)}\n\n`);
    }

    const unsubscribe = subscribeSession(sessionId, (entry) => {
      reply.raw.write(`data: ${JSON.stringify(entry)}\n\n`);
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(": heartbeat\n\n");
    }, 15_000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    return new Promise<void>((r) => request.raw.on("close", r));
  });
}
