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
}

export interface ChatResponse {
  response: string;
  recommendations?: Recommendation[];
  sources?: Book[];
  follow_up_question?: string;
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
