import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BookCard } from "../components/BookCard";
import type { Book } from "../types";
import "./pages.css";

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-block" style={{ aspectRatio: "2/3", maxHeight: 200 }} />
      <div className="skeleton skeleton-block" style={{ height: 14, width: "85%", marginTop: 8 }} />
      <div className="skeleton skeleton-block" style={{ height: 12, width: "60%", marginTop: 6 }} />
    </div>
  );
}

export function GenreDetailPage() {
  const { genre } = useParams<{ genre: string }>();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const decodedGenre = genre ? decodeURIComponent(genre) : "";

  useEffect(() => {
    if (!genre) return;
    setLoading(true);
    setError(null);
    fetch(`/api/genres/${encodeURIComponent(decodedGenre)}/top?limit=20`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { genre: string; books: Book[] }) => {
        setBooks(data.books ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load books for this genre");
        setLoading(false);
      });
  }, [genre, decodedGenre]);

  const capitalised = decodedGenre.charAt(0).toUpperCase() + decodedGenre.slice(1);

  return (
    <div className="page">
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-sep">›</span>
        <Link to="/genres">Genres</Link>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">{capitalised}</span>
      </nav>

      <div className="page-header">
        <Link to="/genres" className="back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Genres
        </Link>
        <h1 className="page-title">{capitalised} — Top Books</h1>
      </div>

      {loading && (
        <div className="grid-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <div className="empty-state">
          <p className="empty-state__title">{error}</p>
        </div>
      )}

      {!loading && !error && books.length === 0 && (
        <div className="empty-state">
          <p className="empty-state__title">No books found for this genre</p>
        </div>
      )}

      {!loading && books.length > 0 && (
        <div className="grid-4">
          {books.map((book) => (
            <BookCard key={book.work_id} book={book} showReason={false} />
          ))}
        </div>
      )}
    </div>
  );
}
