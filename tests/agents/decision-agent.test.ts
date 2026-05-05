import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { ChatMessage, SearchResult } from "../../src/types/index.js";

const mockCreate = mock(() =>
  Promise.resolve({ choices: [{ message: { content: "{}" } }] })
);

mock.module("openai", () => ({
  default: function OpenAI() {
    return { chat: { completions: { create: mockCreate } } };
  },
}));

mock.module("../../src/config.js", () => ({
  config: {
    openrouterApiKey: "test-key",
    openrouterBaseUrl: "https://openrouter.ai/api/v1",
    llmModel: "qwen/qwen-2.5-7b-instruct",
  },
}));

const { recommend } = await import("../../src/agents/decision-agent.js");

const makeBook = (title: string, author: string) => ({
  work_id: title.toLowerCase().replace(/\s+/g, "-"),
  title,
  author,
  genres: "Fiction",
  description: "A wonderful book about many things.",
  avg_rating: 4.2,
  ratings_count: 5000,
  original_publication_year: 2010,
  image_url: "",
});

const retrievedBooks: SearchResult[] = [
  { book: makeBook("The Great Adventure", "Jane Doe"), score: 0.9 },
  { book: makeBook("Mystery in the Dark", "John Smith"), score: 0.8 },
  { book: makeBook("Coding for Beginners", "Alice Brown"), score: 0.75 },
];

const userMessages: ChatMessage[] = [
  { role: "user", content: "I love adventure and mystery books" },
];

function makeLLMResponse(content: string) {
  return { choices: [{ message: { content } }] };
}

beforeEach(() => {
  mockCreate.mockReset();
});

describe("recommend", () => {
  it("returns ChatResponse with recommendations when LLM returns valid JSON", async () => {
    const llmOutput = JSON.stringify({
      recommendations: [
        { book_title: "The Great Adventure", book_author: "Jane Doe", reason: "Perfect for adventure lovers" },
        { book_title: "Mystery in the Dark", book_author: "John Smith", reason: "Great mystery novel" },
        { book_title: "Coding for Beginners", book_author: "Alice Brown", reason: "Unexpectedly exciting" },
      ],
      response: "Here are three books you might enjoy.",
      follow_up_question: "Do you prefer modern or classic settings?",
    });

    mockCreate.mockImplementation(() => Promise.resolve(makeLLMResponse(llmOutput)));

    const result = await recommend(userMessages, retrievedBooks);

    expect(result.response).toBe("Here are three books you might enjoy.");
    expect(result.follow_up_question).toBe("Do you prefer modern or classic settings?");
    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations![0].book.title).toBe("The Great Adventure");
    expect(result.recommendations![0].reason).toBe("Perfect for adventure lovers");
    expect(result.sources).toBeDefined();
    expect(result.sources).toHaveLength(retrievedBooks.length);
  });

  it("maps book objects from retrievedBooks, not LLM output", async () => {
    const llmOutput = JSON.stringify({
      recommendations: [
        { book_title: "The Great Adventure", book_author: "Jane Doe", reason: "Great pick" },
      ],
      response: "Here is a recommendation.",
      follow_up_question: "",
    });

    mockCreate.mockImplementation(() => Promise.resolve(makeLLMResponse(llmOutput)));

    const result = await recommend(userMessages, retrievedBooks);

    expect(result.recommendations![0].book).toEqual(retrievedBooks[0].book);
    expect(result.recommendations![0].book.avg_rating).toBe(4.2);
  });

  it("returns graceful ChatResponse when LLM returns invalid JSON", async () => {
    mockCreate.mockImplementation(() =>
      Promise.resolve(makeLLMResponse("This is not valid JSON at all!!!"))
    );

    const result = await recommend(userMessages, retrievedBooks);

    expect(result.response).toBe("This is not valid JSON at all!!!");
    expect(result.recommendations).toBeUndefined();
  });

  it("returns graceful ChatResponse when LLM returns empty content", async () => {
    mockCreate.mockImplementation(() => Promise.resolve(makeLLMResponse("")));

    const result = await recommend(userMessages, retrievedBooks);

    expect(result.response).toBeTruthy();
    expect(result.recommendations).toBeUndefined();
  });

  it("skips recommendations where book cannot be matched from retrieved context", async () => {
    const llmOutput = JSON.stringify({
      recommendations: [
        { book_title: "The Great Adventure", book_author: "Jane Doe", reason: "Great" },
        { book_title: "Nonexistent Book", book_author: "Nobody", reason: "Hallucinated" },
      ],
      response: "Some books.",
      follow_up_question: null,
    });

    mockCreate.mockImplementation(() => Promise.resolve(makeLLMResponse(llmOutput)));

    const result = await recommend(userMessages, retrievedBooks);

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations![0].book.title).toBe("The Great Adventure");
  });

  it("omits follow_up_question from result when LLM returns empty string", async () => {
    const llmOutput = JSON.stringify({
      recommendations: [],
      response: "No strong matches.",
      follow_up_question: "",
    });

    mockCreate.mockImplementation(() => Promise.resolve(makeLLMResponse(llmOutput)));

    const result = await recommend(userMessages, retrievedBooks);

    expect(result.follow_up_question).toBeUndefined();
  });
});
