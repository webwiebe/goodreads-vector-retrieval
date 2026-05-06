import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { BookCard } from "../components/BookCard";
import { apiFetch } from "../lib/session";
import { hasChatHistory } from "../lib/chat-store";
import type { AuthorDetail } from "../types";
import "./pages.css";

function AuthorCoverPlaceholder() {
  return (
    <div className="author-card__cover">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function AuthorSampleCover({ url, title }: { url: string; title: string }) {
  const [err, setErr] = useState(false);
  if (!url || err) return <AuthorCoverPlaceholder />;
  return (
    <div className="author-card__cover">
      <img src={url} alt={title} onError={() => setErr(true)} loading="lazy" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-block" style={{ aspectRatio: "2/3", maxHeight: 200 }} />
      <div className="skeleton skeleton-block" style={{ height: 14, width: "85%", marginTop: 8 }} />
      <div className="skeleton skeleton-block" style={{ height: 12, width: "60%", marginTop: 6 }} />
    </div>
  );
}

export function AuthorDetailPage() {
  const { authorName } = useParams<{ authorName: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AuthorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showBackToChat] = useState(() => hasChatHistory());

  const decodedName = authorName ? decodeURIComponent(authorName) : "";

  useEffect(() => {
    if (!authorName) return;
    setLoading(true);
    setNotFound(false);
    apiFetch(`/api/authors/${encodeURIComponent(decodedName)}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: AuthorDetail | null) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authorName, decodedName]);

  if (loading) {
    return (
      <div className="page">
        <div className="author-header">
          <div className="skeleton skeleton-block" style={{ width: 72, height: 72, borderRadius: "50%" }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-block" style={{ height: 28, width: "40%", marginBottom: 10 }} />
            <div className="skeleton skeleton-block" style={{ height: 14, width: "25%" }} />
          </div>
        </div>
        <div className="grid-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="page">
        <div className="empty-state">
          <p className="empty-state__title">Author not found</p>
          <Link to="/" className="back-link" style={{ marginTop: 16 }}>← Back to home</Link>
        </div>
      </div>
    );
  }

  const avgRating =
    data.books.length > 0
      ? data.books.reduce((sum, b) => sum + b.avg_rating, 0) / data.books.length
      : 0;

  return (
    <div className="page">
      <nav className="breadcrumb">
        {showBackToChat ? (
          <button className="breadcrumb-back-btn" onClick={() => navigate(-1)}>
            ← Back to conversation
          </button>
        ) : (
          <Link to="/">Home</Link>
        )}
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">{data.author}</span>
      </nav>

      <div className="author-header">
        <div className="author-header-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="author-name">{data.author}</h1>
          <div className="author-stats">
            <span className="author-stat">
              <strong>{data.books.length}</strong> books
            </span>
            {avgRating > 0 && (
              <span className="author-stat">
                <strong>{avgRating.toFixed(2)}</strong> avg rating
              </span>
            )}
          </div>
        </div>
      </div>

      <section style={{ marginBottom: 48 }}>
        <div className="section-header">
          <h2 className="section-title">Books by {data.author}</h2>
        </div>
        <div className="grid-4">
          {data.books.map((book) => (
            <BookCard key={book.work_id} book={book} showReason={false} />
          ))}
        </div>
      </section>

      {data.similarAuthors.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div className="section-header">
            <h2 className="section-title">Similar Authors</h2>
          </div>
          <div className="scroll-row">
            {data.similarAuthors.map(({ author, sampleBook }) => (
              <Link
                key={author}
                to={`/authors/${encodeURIComponent(author)}`}
                className="author-card"
              >
                <AuthorSampleCover url={sampleBook.image_url} title={sampleBook.title} />
                <div className="author-card__name">{author}</div>
                <div className="author-card__book">{sampleBook.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
