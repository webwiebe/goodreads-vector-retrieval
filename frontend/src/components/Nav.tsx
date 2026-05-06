import { Link, NavLink } from "react-router-dom";
import type { HealthStatus } from "../types";
import "./Nav.css";

const LANGUAGES = [
  { value: "any", label: "Any Language" },
  { value: "English", label: "English" },
  { value: "Dutch", label: "Dutch" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Spanish", label: "Spanish" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Italian", label: "Italian" },
  { value: "Russian", label: "Russian" },
  { value: "Japanese", label: "Japanese" },
  { value: "Chinese", label: "Chinese" },
  { value: "Arabic", label: "Arabic" },
  { value: "Swedish", label: "Swedish" },
  { value: "Norwegian", label: "Norwegian" },
  { value: "Danish", label: "Danish" },
  { value: "Polish", label: "Polish" },
  { value: "Turkish", label: "Turkish" },
];

interface NavProps {
  health?: HealthStatus | null;
  useRag?: boolean;
  onRagToggle?: (v: boolean) => void;
  language?: string;
  onLanguageChange?: (lang: string) => void;
}

function HealthDot({ health }: { health: HealthStatus }) {
  const isHealthy = health.status === "ok" && health.qdrant;
  const isPartial = health.status === "ok" && !health.qdrant;
  const statusClass = isHealthy
    ? "health-dot--green"
    : isPartial
    ? "health-dot--amber"
    : "health-dot--red";
  const label = isHealthy ? "System healthy" : isPartial ? "Degraded" : "System offline";

  return (
    <span
      className={`health-dot ${statusClass}`}
      title={label}
      aria-label={label}
    />
  );
}

export function Nav({
  health,
  useRag,
  onRagToggle,
  language = "any",
  onLanguageChange,
}: NavProps) {
  const langActive = language && language !== "any";

  return (
    <nav className="nav">
      <div className="nav__inner">
        {/* Logo */}
        <Link to="/" className="nav__logo">
          <svg
            className="nav__logo-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="nav__logo-text">Book Recommender</span>
        </Link>

        {/* Page links */}
        <div className="nav__links">
          <NavLink to="/genres" className="nav__link">
            Genres
          </NavLink>
          <NavLink to="/docs" className="nav__link">
            Docs
          </NavLink>
        </div>

        {/* Controls */}
        <div className="nav__controls">
          {/* Language selector */}
          {onLanguageChange && (
            <select
              className={`nav__lang-select${langActive ? " nav__lang-select--active" : ""}`}
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              aria-label="Filter by language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          )}

          {/* RAG toggle */}
          {onRagToggle !== undefined && (
            <label className="nav__rag-toggle" title="Use RAG retrieval">
              <span className="nav__rag-label">RAG</span>
              <span className="nav__toggle-track">
                <input
                  type="checkbox"
                  className="nav__toggle-input"
                  checked={useRag ?? true}
                  onChange={(e) => onRagToggle(e.target.checked)}
                />
                <span className="nav__toggle-thumb" />
              </span>
            </label>
          )}

          {/* Health indicator */}
          {health != null && <HealthDot health={health} />}
        </div>
      </div>
    </nav>
  );
}
