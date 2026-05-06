import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BookCard } from "../components/BookCard";
import { StarRating } from "../components/StarRating";
import type { BookDetail } from "../types";
import "./pages.css";

function BookCoverPlaceholder({ size = "large" }: { size?: "large" | "small" }) {
  const w = size === "large" ? 180 : 80;
  const h = size === "large" ? 270 : 120;
  return (
    <div
      className={size === "large" ? "book-detail-cover-placeholder" : ""}
      style={
        size === "small"
          ? {
              width: w,
              height: h,
              background: "var(--navy-700)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              flexShrink: 0,
            }
          : undefined
      }
    >
      <svg width={size === "large" ? 48 : 24} height={size === "large" ? 48 : 24} viewBox="0 0 24 24" fill="none">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function BookCover({ url, title, size = "large" }: { url: string; title: string; size?: "large" | "small" }) {
  const [err, setErr] = useState(false);
  if (!url || err) return <BookCoverPlaceholder size={size} />;
  return (
    <img
      className={size === "large" ? "book-detail-cover" : ""}
      style={
        size === "small"
          ? { width: 80, height: 120, objectFit: "cover", borderRadius: "var(--radius-sm)", flexShrink: 0 }
          : undefined
      }
      src={url}
      alt={`Cover of ${title}`}
      onError={() => setErr(true)}
    />
  );
}

export function BookDetailPage() {
  const { workId } = useParams<{ workId: string }>();
  const [data, setData] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!workId) return;
    setLoading(true);
    setNotFound(false);
    fetch(`/api/books/${workId}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: BookDetail | null) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workId]);

  if (loading) {
    return (
      <div className="page">
        <div className="book-detail-hero">
          <div className="skeleton skeleton-block" style={{ width: 180, aspectRatio: "2/3" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="skeleton skeleton-block" style={{ height: 28, width: "70%" }} />
            <div className="skeleton skeleton-block" style={{ height: 18, width: "40%" }} />
            <div className="skeleton skeleton-block" style={{ height: 14, width: "30%" }} />
            <div className="skeleton skeleton-block" style={{ height: 80, marginTop: 12 }} />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="page">
        <div className="empty-state">
          <p className="empty-state__title">Book not found</p>
          <p className="empty-state__sub">The book you're looking for doesn't exist in our catalog.</p>
          <Link to="/" className="back-link" style={{ marginTop: 16 }}>← Back to home</Link>
        </div>
      </div>
    );
  }

  const { book, similar } = data;

  const genres = book.genres
    ? book.genres.split(",").map((g) => g.trim()).filter(Boolean)
    : [];

  const authorBooks = similar.filter((b) => b.author === book.author).slice(0, 4);
  const similarBooks = similar.slice(0, 6);

  return (
    <div className="page">
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">{book.title}</span>
      </nav>

      <div className="book-detail-hero">
        <BookCover url={book.image_url} title={book.title} size="large" />

        <div>
          <h1 className="book-detail-title">{book.title}</h1>
          <Link
            to={`/authors/${encodeURIComponent(book.author)}`}
            className="book-detail-author"
          >
            {book.author}
          </Link>

          <div className="book-detail-meta">
            <span className="book-detail-meta-item">
              <StarRating rating={book.avg_rating} count={book.ratings_count} size="md" />
            </span>
            {book.original_publication_year && (
              <span className="book-detail-meta-item">
                Published {book.original_publication_year}
              </span>
            )}
            {book.ratings_count > 0 && (
              <span className="book-detail-meta-item">
                {book.ratings_count.toLocaleString()} ratings
              </span>
            )}
          </div>

          {genres.length > 0 && (
            <div className="book-detail-genres">
              {genres.map((g) => (
                <Link key={g} to={`/genres/${encodeURIComponent(g)}`} className="genre-tag">
                  {g}
                </Link>
              ))}
            </div>
          )}

          {book.description && (
            <p className="book-detail-description">{book.description}</p>
          )}
        </div>
      </div>

      {similarBooks.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div className="section-header">
            <h2 className="section-title">More like this</h2>
          </div>
          <div className="scroll-row">
            {similarBooks.map((b) => (
              <div key={b.work_id} style={{ minWidth: 160, maxWidth: 180, flexShrink: 0 }}>
                <BookCard book={b} showReason={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      {authorBooks.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div className="section-header">
            <h2 className="section-title">More by {book.author}</h2>
            <Link to={`/authors/${encodeURIComponent(book.author)}`} className="section-link">
              View all →
            </Link>
          </div>
          <div className="scroll-row">
            {authorBooks.map((b) => (
              <div key={b.work_id} style={{ minWidth: 160, maxWidth: 180, flexShrink: 0 }}>
                <BookCard book={b} showReason={false} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
