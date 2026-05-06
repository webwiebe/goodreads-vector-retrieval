import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { SearchResult } from "../../src/types/index.js";

const FAKE_VECTOR = [0.1, 0.2, 0.3];

const mockEmbedText = mock(() => Promise.resolve(FAKE_VECTOR));
const mockSearchBooks = mock(() => Promise.resolve([] as SearchResult[]));

mock.module("../../src/rag/embeddings.js", () => ({
  embedText: mockEmbedText,
}));

mock.module("../../src/rag/vector-store.js", () => ({
  searchBooks: mockSearchBooks,
}));

const { searchMemory } = await import("../../src/agents/memory-agent.js");

const makeBook = (title: string) => ({
  work_id: title,
  title,
  author: "Author",
  genres: "Fiction",
  description: "A book",
  avg_rating: 4.0,
  ratings_count: 1000,
  original_publication_year: 2000,
  image_url: "",
});

const results: SearchResult[] = [
  { book: makeBook("High Score Book"), score: 0.9 },
  { book: makeBook("Threshold Book"), score: 0.31 },
  { book: makeBook("At Threshold Book"), score: 0.3 },
  { book: makeBook("Below Threshold Book"), score: 0.29 },
  { book: makeBook("Zero Score Book"), score: 0.0 },
];

beforeEach(() => {
  mockEmbedText.mockReset();
  mockSearchBooks.mockReset();
  mockEmbedText.mockImplementation(() => Promise.resolve(FAKE_VECTOR));
  mockSearchBooks.mockImplementation(() => Promise.resolve(results));
});

describe("searchMemory", () => {
  it("embeds the query and passes the vector to searchBooks", async () => {
    await searchMemory("fantasy books", 5);
    expect(mockEmbedText).toHaveBeenCalledWith("fantasy books");
    expect(mockSearchBooks).toHaveBeenCalledWith(FAKE_VECTOR, 5);
  });

  it("uses topK default of 20 when not provided", async () => {
    await searchMemory("mystery");
    expect(mockSearchBooks).toHaveBeenCalledWith(FAKE_VECTOR, 20);
  });

  it("filters out results with score <= 0.3", async () => {
    const filtered = await searchMemory("something");
    const titles = filtered.map((r) => r.book.title);
    expect(titles).toContain("High Score Book");
    expect(titles).toContain("Threshold Book");
    expect(titles).not.toContain("At Threshold Book");
    expect(titles).not.toContain("Below Threshold Book");
    expect(titles).not.toContain("Zero Score Book");
  });

  it("returns an empty array when all results are below threshold", async () => {
    mockSearchBooks.mockImplementation(() =>
      Promise.resolve([
        { book: makeBook("Bad Book A"), score: 0.1 },
        { book: makeBook("Bad Book B"), score: 0.0 },
      ])
    );
    const filtered = await searchMemory("nothing matches");
    expect(filtered).toHaveLength(0);
  });

  it("returns all results when all are above threshold", async () => {
    const highResults: SearchResult[] = [
      { book: makeBook("Great Book A"), score: 0.95 },
      { book: makeBook("Great Book B"), score: 0.85 },
    ];
    mockSearchBooks.mockImplementation(() => Promise.resolve(highResults));
    const filtered = await searchMemory("great books");
    expect(filtered).toHaveLength(2);
  });
});
