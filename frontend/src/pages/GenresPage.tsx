import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/session";
import type { GenreSummary } from "../types";
import "./pages.css";

function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GenreCover({ url, title }: { url: string; title: string }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div className="genre-card__cover">
        <BookIcon />
      </div>
    );
  }
  return (
    <img
      className="genre-card__cover-img"
      src={url}
      alt={title}
      loading="lazy"
      onError={() => setErr(true)}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-block" style={{ height: 56, width: "60%" }} />
      <div className="skeleton skeleton-block" style={{ height: 14, width: "80%", marginTop: 8 }} />
      <div className="skeleton skeleton-block" style={{ height: 12, width: "40%", marginTop: 4 }} />
    </div>
  );
}

export function GenresPage() {
  const [genres, setGenres] = useState<GenreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/genres?limit=50")
      .then((r) => r.json())
      .then((data: { genres: GenreSummary[] }) => {
        setGenres(data.genres ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load genres");
        setLoading(false);
      });
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Browse by Genre</h1>
        <p className="page-subtitle">Explore curated book collections by genre</p>
      </div>

      {loading && (
        <div className="grid-3">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <div className="empty-state">
          <div className="empty-state__icon"><BookIcon /></div>
          <p className="empty-state__title">{error}</p>
        </div>
      )}

      {!loading && !error && genres.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon"><BookIcon /></div>
          <p className="empty-state__title">Building genre index…</p>
          <p className="empty-state__sub">The genre index is still being built. Check back shortly.</p>
        </div>
      )}

      {!loading && genres.length > 0 && (
        <div className="grid-3">
          {genres.map((genre) => (
            <Link
              key={genre.name}
              to={`/genres/${encodeURIComponent(genre.name)}`}
              className="genre-card"
            >
              <div className="genre-card__covers">
                {genre.topBooks.slice(0, 3).map((b) => (
                  <GenreCover key={b.work_id} url={b.image_url} title={b.title} />
                ))}
              </div>
              <div>
                <div className="genre-card__name">{genre.name}</div>
                <div className="genre-card__count">{genre.count.toLocaleString()} books</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
