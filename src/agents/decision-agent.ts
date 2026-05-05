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
    "Output a SINGLE JSON object. It must open with { and close with ONE }.",
    "ALL three fields — recommendations, response, follow_up_question — must be INSIDE that same object.",
    "No markdown, no code fences, no extra text before or after the JSON.",
    "",
    "Use this exact structure:",
    JSON.stringify(
      {
        recommendations: [
          { book_title: "Title Here", book_author: "Author Here", reason: "Reason here" },
        ],
        response: "Your conversational message to the user",
        follow_up_question: "Optional follow-up question, or empty string",
      },
      null,
      2
    ),
  ].join("\n");
}

function extractBracketedArray(raw: string, fieldName: string): LLMRecommendation[] {
  const fieldIdx = raw.indexOf(`"${fieldName}"`);
  if (fieldIdx === -1) return [];
  const arrStart = raw.indexOf("[", fieldIdx);
  if (arrStart === -1) return [];
  let depth = 0;
  let arrEnd = arrStart;
  for (let i = arrStart; i < raw.length; i++) {
    if (raw[i] === "[") depth++;
    else if (raw[i] === "]") {
      depth--;
      if (depth === 0) { arrEnd = i; break; }
    }
  }
  try {
    return JSON.parse(raw.slice(arrStart, arrEnd + 1)) as LLMRecommendation[];
  } catch {
    return [];
  }
}

function parseModelOutput(raw: string): LLMOutput | null {
  // 1. Direct parse
  try { return JSON.parse(raw) as LLMOutput; } catch { /* continue */ }

  // 2. Strip markdown code fences
  const stripped = raw.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
  try { return JSON.parse(stripped) as LLMOutput; } catch { /* continue */ }

  // 3. Field-by-field extraction — handles premature outer closing brace
  const recommendations = extractBracketedArray(raw, "recommendations");
  const respMatch = raw.match(/"response"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const fuqMatch = raw.match(/"follow_up_question"\s*:\s*"((?:[^"\\]|\\.)*)"/);

  if (recommendations.length > 0 || respMatch) {
    return {
      recommendations,
      response: respMatch ? respMatch[1] : "",
      follow_up_question: fuqMatch ? fuqMatch[1] : undefined,
    };
  }

  return null;
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

  const parsed = parseModelOutput(raw);
  if (!parsed) {
    return { response: "I had trouble formatting my response. Please try asking again." };
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
