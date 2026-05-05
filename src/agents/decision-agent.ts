import OpenAI from "openai";
import { config } from "../config.js";
import type { Book, ChatMessage, ChatResponse, SearchResult } from "../types/index.js";

const client = new OpenAI({
  apiKey: config.openrouterApiKey,
  baseURL: config.openrouterBaseUrl,
});

interface LLMRecommendation {
  book_title: string;
  book_author: string;
  reason: string;
}

interface LLMOutput {
  recommendations?: LLMRecommendation[];
  response?: string;
  follow_up_question?: string;
}

function buildSystemPrompt(retrievedBooks: SearchResult[]): string {
  const bookList = retrievedBooks
    .map((r, i) => {
      const b = r.book;
      const desc = b.description ? b.description.slice(0, 200) : "";
      return `${i + 1}. Title: "${b.title}" | Author: ${b.author} | Genres: ${b.genres} | Rating: ${b.avg_rating} | Description: ${desc}`;
    })
    .join("\n");

  return [
    "You are a book recommendation expert.",
    "",
    "Use ONLY the following books as context to make recommendations:",
    bookList,
    "",
    "Pick exactly 3 books from the context above that best match the user's preferences.",
    "Explain why each book is relevant to what the user is looking for.",
    "",
    'Output ONLY valid JSON in this exact shape, with no markdown or extra text:',
    '{"recommendations": [{"book_title": "", "book_author": "", "reason": ""}], "response": "", "follow_up_question": ""}',
  ].join("\n");
}

function findBook(retrievedBooks: SearchResult[], title: string, author: string): Book | null {
  const titleLower = title.toLowerCase();
  const authorLower = author.toLowerCase();

  const exact = retrievedBooks.find(
    (r) =>
      r.book.title.toLowerCase() === titleLower && r.book.author.toLowerCase() === authorLower
  );
  if (exact) return exact.book;

  const byTitle = retrievedBooks.find((r) => r.book.title.toLowerCase() === titleLower);
  if (byTitle) return byTitle.book;

  const partial = retrievedBooks.find((r) => r.book.title.toLowerCase().includes(titleLower));
  if (partial) return partial.book;

  return null;
}

export async function recommend(
  userMessages: ChatMessage[],
  retrievedBooks: SearchResult[]
): Promise<ChatResponse> {
  const systemPrompt = buildSystemPrompt(retrievedBooks);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...userMessages.map((m) => ({
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

  let parsed: LLMOutput;
  try {
    parsed = JSON.parse(raw) as LLMOutput;
  } catch {
    return { response: raw || "I encountered an issue generating recommendations. Please try again." };
  }

  const recommendations = (parsed.recommendations ?? [])
    .map((rec) => {
      const book = findBook(retrievedBooks, rec.book_title, rec.book_author);
      if (!book) return null;
      return { book, reason: rec.reason };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return {
    response: parsed.response ?? "",
    recommendations: recommendations.length > 0 ? recommendations : undefined,
    sources: retrievedBooks.map((r) => r.book),
    follow_up_question: parsed.follow_up_question || undefined,
  };
}
