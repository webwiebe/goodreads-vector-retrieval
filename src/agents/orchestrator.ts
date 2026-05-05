import OpenAI from "openai";
import { config } from "../config.js";
import { searchMemory } from "./memory-agent.js";
import { recommend } from "./decision-agent.js";
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

async function callLLMDirect(request: ChatRequest): Promise<ChatResponse> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: NO_RAG_SYSTEM_PROMPT },
    ...request.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  const completion = await client.chat.completions.create({
    model: config.llmModel,
    messages,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  let parsed: NoRagLLMOutput;
  try {
    parsed = JSON.parse(raw) as NoRagLLMOutput;
  } catch {
    return { response: raw || "Unable to generate recommendations at this time." };
  }

  return {
    response: parsed.response ?? "",
    recommendations: (parsed.recommendations ?? []).map((r) => ({
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
    })),
    follow_up_question: parsed.follow_up_question || undefined,
  };
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const useRag = request.useRag !== false;

  if (!useRag) {
    return callLLMDirect(request);
  }

  const lastUserMessage = [...request.messages].reverse().find((m) => m.role === "user");
  const query = lastUserMessage?.content ?? "";

  const retrievedBooks = await searchMemory(query);
  return recommend(request.messages, retrievedBooks);
}
