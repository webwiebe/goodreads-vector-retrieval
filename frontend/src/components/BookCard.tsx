import { useState } from "react";
import type { Recommendation } from "../types";
import "./BookCard.css";

interface Props {
  recommendation: Recommendation;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span className="star-rating" aria-label={`${rating.toFixed(1)} out of 5`}>
      {Array.from({ length: full }, (_, i) => (
        <span key={`f${i}`} className="star star--full">★</span>
      ))}
      {half && <span className="star star--half">★</span>}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e${i}`} className="star star--empty">★</span>
      ))}
      <span className="star-value">{rating.toFixed(1)}</span>
    </span>
  );
}

export function BookCard({ recommendation }: Props) {
  const { book, reason } = recommendation;
  const [imgError, setImgError] = useState(false);

  const genres = book.genres
    ? book.genres.split(",").map((g) => g.trim()).filter(Boolean).slice(0, 3)
    : [];

  const hasImage = book.image_url && !imgError;

  return (
    <article className="book-card">
      <div className="book-card__cover">
        {hasImage ? (
          <img
            src={book.image_url}
            alt={`Cover of ${book.title}`}
            className="book-card__cover-img"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="book-card__cover-placeholder">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="book-card__body">
        <h3 className="book-card__title" title={book.title}>
          {book.title}
        </h3>
        <p className="book-card__author">{book.author}</p>

        <StarRating rating={book.avg_rating} />

        {genres.length > 0 && (
          <div className="book-card__genres">
            {genres.map((g) => (
              <span key={g} className="genre-tag">
                {g}
              </span>
            ))}
          </div>
        )}

        <p className="book-card__reason">{reason}</p>
      </div>
    </article>
  );
}
