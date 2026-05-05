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

export interface Recommendation {
  book: Book;
  reason: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  response: string;
  recommendations?: Recommendation[];
  sources?: Book[];
  follow_up_question?: string;
}

export interface HealthStatus {
  status: string;
  qdrant: string;
  ingestionComplete: boolean;
  indexedBooks: number;
}

export interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: Recommendation[];
  sources?: Book[];
  follow_up_question?: string;
}
