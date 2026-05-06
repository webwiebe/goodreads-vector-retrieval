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
  verified?: boolean;
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
  useRag?: boolean;
}

export interface HealthStatus {
  status: string;
  qdrant: boolean;
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
  useRag?: boolean;
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
