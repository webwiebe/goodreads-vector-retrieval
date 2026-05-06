interface Props {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}

export function StarRating({ rating, count, size = "sm" }: Props) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);

  const filledColor = "#f59e0b";
  const emptyColor = "#334155";
  const fontSize = size === "md" ? "1rem" : "0.75rem";
  const valueSize = size === "md" ? "0.875rem" : "0.72rem";

  return (
    <span
      className={`star-rating star-rating--${size}`}
      aria-label={`${rating.toFixed(1)} out of 5${count != null ? `, ${count.toLocaleString()} ratings` : ""}`}
      style={{ display: "inline-flex", alignItems: "center", gap: "1px" }}
    >
      {Array.from({ length: full }, (_, i) => (
        <span
          key={`f${i}`}
          aria-hidden="true"
          style={{ fontSize, color: filledColor, lineHeight: 1 }}
        >
          ★
        </span>
      ))}
      {half && (
        <span
          aria-hidden="true"
          style={{ fontSize, color: filledColor, opacity: 0.6, lineHeight: 1 }}
        >
          ★
        </span>
      )}
      {Array.from({ length: empty }, (_, i) => (
        <span
          key={`e${i}`}
          aria-hidden="true"
          style={{ fontSize, color: emptyColor, lineHeight: 1 }}
        >
          ★
        </span>
      ))}
      <span
        style={{
          fontSize: valueSize,
          color: "#94a3b8",
          marginLeft: "5px",
          fontWeight: 500,
        }}
      >
        {rating.toFixed(1)}
        {count != null && (
          <span style={{ color: "#64748b", marginLeft: "3px" }}>
            ({count.toLocaleString()})
          </span>
        )}
      </span>
    </span>
  );
}
