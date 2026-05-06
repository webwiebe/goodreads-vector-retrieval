import type { Book } from "../types/index.js";
import { scrollAllBooks } from "./vector-store.js";

export interface GenreEntry {
  name: string;
  count: number;
  topBooks: Book[];
}

let cache: Map<string, Book[]> | null = null;

function popularityScore(book: Book): number {
  return book.avg_rating * Math.log10(book.ratings_count + 10);
}

export async function buildGenreIndex(): Promise<void> {
  const books = await scrollAllBooks();
  const map = new Map<string, Book[]>();

  for (const book of books) {
    if (!book.genres) continue;
    const genres = book.genres
      .split(",")
      .map((g) => g.trim().toLowerCase())
      .filter((g) => g.length > 0);

    for (const genre of genres) {
      const list = map.get(genre) ?? [];
      list.push(book);
      map.set(genre, list);
    }
  }

  cache = map;
}

export function getTopGenres(limit = 30): GenreEntry[] {
  if (!cache) return [];

  const entries: GenreEntry[] = [];
  for (const [name, books] of cache.entries()) {
    const sorted = [...books].sort((a, b) => popularityScore(b) - popularityScore(a));
    entries.push({ name, count: books.length, topBooks: sorted.slice(0, 10) });
  }

  return entries.sort((a, b) => b.count - a.count).slice(0, limit);
}

export function getBooksInGenre(genre: string, limit = 10): Book[] {
  if (!cache) return [];
  const normalized = genre.trim().toLowerCase();
  const books = cache.get(normalized) ?? [];
  return [...books]
    .sort((a, b) => popularityScore(b) - popularityScore(a))
    .slice(0, limit);
}

export function isGenreIndexReady(): boolean {
  return cache !== null;
}
