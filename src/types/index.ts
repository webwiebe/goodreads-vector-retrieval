export interface Book {
  work_id: string;
  title: string;
  author: string;
  genres: string;
  description: string;
  avg_rating: number;
  ratings_count: number;
  original_publication_year: number | null;
  image_url: string;
  score?: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Recommendation {
  book: Book;
  reason: string;
  verified?: boolean;
}

export interface ChatResponse {
  response: string;
  recommendations?: Recommendation[];
  sources?: Book[];
  follow_up_question?: string;
  useRag?: boolean;
}

export interface ChatRequest {
  messages: ChatMessage[];
  useRag?: boolean;
}

export interface SearchResult {
  book: Book;
  score: number;
}

export interface IngestionStatus {
  complete: boolean;
  totalBooks: number;
  indexedBooks: number;
  inProgress: boolean;
  error?: string;
}

export interface GenreSummary {
  name: string;
  count: number;
  topBooks: Book[];
}

export interface BookDetail {
  book: Book;
  similar: Book[];
}

export interface AuthorDetail {
  author: string;
  books: Book[];
  similarAuthors: { author: string; sampleBook: Book }[];
}

export interface DocMeta {
  name: string;
  title: string;
}

export interface DocContent {
  name: string;
  title: string;
  content: string;
}

export type { LogEntryType, LogEntry } from "../lib/session-logger.js";
