import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { chat } from "../../agents/orchestrator.js";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  useRag: z.boolean().optional(),
});

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/chat", async (request, reply) => {
    const parseResult = chatRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    try {
      const response = await chat(parseResult.data);
      return reply.send(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return reply.status(500).send({ error: message });
    }
  });
}
