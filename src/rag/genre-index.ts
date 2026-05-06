import type { Book } from "../types/index.js";
import { scrollAllBooks } from "./vector-store.js";

export interface GenreEntry {
  name: string;
  count: number;
  topBooks: Book[];
}

interface GenreBookEntry {
  book: Book;
  position: number; // 0-based index in the book's genre list
}

// Genres that are too broad to use as discriminating category headers
const NOISE_GENRES = new Set(["fiction", "non-fiction", "nonfiction", "novels", "novel", "literature", "books", "read", "owned", "default", "favorites"]);

let cache: Map<string, GenreBookEntry[]> | null = null;

function popularityScore(entry: GenreBookEntry): number {
  const base = entry.book.avg_rating * Math.log10(entry.book.ratings_count + 10);
  // Exponential decay by genre position: primary genre (pos=0) gets full weight.
  // pos=1 → 0.50, pos=2 → 0.25, pos=3 → 0.12 ...
  // This means a book must have 8x higher popularity to rank #1 in its 4th genre
  // over a book where it's the primary genre.
  return base * Math.pow(0.5, entry.position);
}

export async function buildGenreIndex(): Promise<void> {
  const books = await scrollAllBooks();
  const map = new Map<string, GenreBookEntry[]>();

  for (const book of books) {
    if (!book.genres) continue;
    const genres = book.genres
      .split(",")
      .map((g) => g.trim().toLowerCase())
      .filter((g) => g.length > 0);

    genres.forEach((genre, position) => {
      if (NOISE_GENRES.has(genre)) return;
      const list = map.get(genre) ?? [];
      list.push({ book, position });
      map.set(genre, list);
    });
  }

  cache = map;
}

export function getTopGenres(limit = 30): GenreEntry[] {
  if (!cache) return [];

  const entries: GenreEntry[] = [];
  for (const [name, entries_] of cache.entries()) {
    const sorted = [...entries_].sort((a, b) => popularityScore(b) - popularityScore(a));
    entries.push({
      name,
      count: entries_.length,
      topBooks: sorted.slice(0, 10).map((e) => e.book),
    });
  }

  return entries.sort((a, b) => b.count - a.count).slice(0, limit);
}

export function getBooksInGenre(genre: string, limit = 10): Book[] {
  if (!cache) return [];
  const normalized = genre.trim().toLowerCase();
  const entries = cache.get(normalized) ?? [];
  return [...entries]
    .sort((a, b) => popularityScore(b) - popularityScore(a))
    .slice(0, limit)
    .map((e) => e.book);
}

export function isGenreIndexReady(): boolean {
  return cache !== null;
}
