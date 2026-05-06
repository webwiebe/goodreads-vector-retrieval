import OpenAI from "openai";
import { config } from "../config.js";
import { searchMemory } from "./memory-agent.js";
import { recommend } from "./decision-agent.js";
import { embedText } from "../rag/embeddings.js";
import { searchBooks } from "../rag/vector-store.js";
import { sessionLog } from "../lib/session-logger.js";
import type { ChatRequest, ChatResponse } from "../types/index.js";

const client = new OpenAI({
  apiKey: config.openrouterApiKey,
  baseURL: config.openrouterBaseUrl,
});

const NO_RAG_SYSTEM_PROMPT =
  "You are a book recommendation expert. Recommend 3 books based on the user's preferences. " +
  'Respond in JSON: {"recommendations": [{"book_title": "", "book_author": "", "reason": ""}], "response": "", "follow_up_question": ""}';

interface NoRagLLMOutput {
  recommendations?: { book_title: string; book_author: string; reason: string }[];
  response?: string;
  follow_up_question?: string;
}

function wordSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function titleOverlap(a: string, b: string): number {
  const setA = wordSet(a);
  const setB = wordSet(b);
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

async function verifyInDataset(title: string, author: string): Promise<boolean> {
  try {
    const vector = await embedText(`${title} ${author}`);
    const results = await searchBooks(vector, 1);
    if (results.length === 0) return false;
    return titleOverlap(title, results[0].book.title) > 0.5;
  } catch {
    return false;
  }
}

async function callLLMDirect(
  request: ChatRequest,
  sessionId?: string
): Promise<ChatResponse> {
  const lastUserMsg = [...request.messages].reverse().find((m) => m.role === "user");

  if (sessionId) {
    sessionLog(sessionId, "llm-prompt", {
      model: config.llmModel,
      useRag: false,
      contextBookCount: 0,
      userMessage: (lastUserMsg?.content ?? "").slice(0, 200),
      systemPromptLength: NO_RAG_SYSTEM_PROMPT.length,
    });
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: NO_RAG_SYSTEM_PROMPT },
    ...request.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  const t0 = Date.now();
  const completion = await client.chat.completions.create({
    model: config.llmModel,
    messages,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  let parsed: NoRagLLMOutput | null = null;
  try {
    parsed = JSON.parse(raw) as NoRagLLMOutput;
  } catch {
    if (sessionId) {
      sessionLog(sessionId, "llm-response", {
        model: config.llmModel,
        durationMs: Date.now() - t0,
        recommendationCount: 0,
        hasFollowUp: false,
        jsonParsed: false,
        usage: completion.usage
          ? {
              inputTokens: completion.usage.prompt_tokens,
              outputTokens: completion.usage.completion_tokens,
            }
          : undefined,
      });
    }
    return { response: raw || "Unable to generate recommendations at this time.", useRag: false };
  }

  const rawRecs = parsed?.recommendations ?? [];

  // Verify each recommendation against the vector DB
  const verified = await Promise.all(
    rawRecs.map((r) => verifyInDataset(r.book_title, r.book_author))
  );

  const unverifiedCount = verified.filter((v) => !v).length;

  if (sessionId) {
    sessionLog(sessionId, "llm-response", {
      model: config.llmModel,
      durationMs: Date.now() - t0,
      recommendationCount: rawRecs.length,
      hasFollowUp: !!(parsed?.follow_up_question),
      jsonParsed: true,
      useRag: false,
      verifiedCount: rawRecs.length - unverifiedCount,
      unverifiedCount,
      usage: completion.usage
        ? {
            inputTokens: completion.usage.prompt_tokens,
            outputTokens: completion.usage.completion_tokens,
          }
        : undefined,
    });
  }

  return {
    response: parsed.response ?? "",
    recommendations: rawRecs.map((r, i) => ({
      book: {
        work_id: "",
        title: r.book_title,
        author: r.book_author,
        genres: "",
        description: "",
        avg_rating: 0,
        ratings_count: 0,
        original_publication_year: null,
        image_url: "",
      },
      reason: r.reason,
      verified: verified[i],
    })),
    follow_up_question: parsed.follow_up_question || undefined,
    useRag: false,
  };
}

export async function chat(
  request: ChatRequest,
  sessionId?: string
): Promise<ChatResponse> {
  if (request.useRag === false) {
    return callLLMDirect(request, sessionId);
  }

  const lastUserMessage = [...request.messages].reverse().find((m) => m.role === "user");
  const query = lastUserMessage?.content ?? "";

  const retrievedBooks = await searchMemory(query, 20, sessionId);
  const response = await recommend(request.messages, retrievedBooks, sessionId);
  return { ...response, useRag: true };
}
