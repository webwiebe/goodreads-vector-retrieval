import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { chat } from "../../agents/orchestrator.js";
import type { ChatMessage } from "../../types/index.js";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  useRag: z.boolean().optional(),
  language: z.string().optional(),
});

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/chat", async (request, reply) => {
    const parseResult = chatRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const { messages, useRag, language } = parseResult.data;

    let effectiveMessages: ChatMessage[] = messages;
    if (language && language !== "any") {
      const lastUserIndex = [...messages].map((m, i) => ({ m, i })).reverse().find(({ m }) => m.role === "user")?.i;
      if (lastUserIndex !== undefined) {
        effectiveMessages = messages.map((msg, i) =>
          i === lastUserIndex
            ? { ...msg, content: `[Language preference: ${language} language books only] ${msg.content}` }
            : msg
        );
      }
    }

    const sessionId = request.headers["x-session-id"] as string | undefined;

    try {
      const response = await chat({ messages: effectiveMessages, useRag }, sessionId);
      return reply.send(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return reply.status(500).send({ error: message });
    }
  });
}
