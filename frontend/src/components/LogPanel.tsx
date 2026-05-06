import { useState, useEffect, useRef, useCallback } from "react";
import { SESSION_ID } from "../lib/session";
import "./LogPanel.css";

interface LogEntry {
  id: string;
  timestamp: number;
  type: "vector-query" | "llm-prompt" | "llm-response" | "route" | "error";
  data: Record<string, unknown>;
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CpuIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="9" y="9" width="6" height="6" stroke="currentColor" strokeWidth="2" />
      <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface LogEntryProps {
  entry: LogEntry;
}

function LogEntryRow({ entry }: LogEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const { type, data, timestamp } = entry;

  const time = relativeTime(timestamp);

  if (type === "route") {
    return (
      <div className="log-entry log-entry--route">
        <div className="log-entry__icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="log-entry__content">
          <div className="log-entry__route">
            {String(data.method ?? "")} {String(data.url ?? "")} → {String(data.statusCode ?? "")}
            {data.durationMs !== undefined ? ` (${String(data.durationMs)}ms)` : ""}
          </div>
        </div>
        <div className="log-entry__time">{time}</div>
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className="log-entry log-entry--error">
        <div className="log-entry__icon"><AlertIcon /></div>
        <div className="log-entry__content">
          <div className="log-entry__header">
            <span className="log-entry__title">Error</span>
            <span className="log-entry__time">{time}</span>
          </div>
          <div className="log-entry__body">{String(data.message ?? "Unknown error")}</div>
        </div>
      </div>
    );
  }

  if (type === "vector-query") {
    const topResults = Array.isArray(data.topResults) ? data.topResults as Array<Record<string, unknown>> : [];
    const dist = data.scoreDistribution as { max?: number; min?: number; mean?: number; p75?: number } | undefined;
    const semanticOnly = typeof data.semanticOnlyCount === "number" ? data.semanticOnlyCount : null;
    const keywordMatches = typeof data.keywordMatchCount === "number" ? data.keywordMatchCount : null;
    const totalResults = typeof data.resultCount === "number" ? data.resultCount : 0;
    const hasExpand = topResults.length > 0;
    const scoreMax = dist?.max ?? 1;
    const scoreMin = dist?.min ?? 0;
    return (
      <div
        className={`log-entry log-entry--vector-query${hasExpand ? " log-entry--expandable" : ""}`}
        onClick={hasExpand ? () => setExpanded((v) => !v) : undefined}
      >
        <div className="log-entry__icon"><SearchIcon /></div>
        <div className="log-entry__content">
          <div className="log-entry__header">
            <span className="log-entry__title">Vector search</span>
            {!!data.embeddingModel && (
              <span className="log-entry__badge log-entry__badge--dim">
                {String(data.embeddingDimensions ?? 384)}d
              </span>
            )}
            <span className="log-entry__time">{time}</span>
          </div>
          <div className="log-entry__body">
            &ldquo;{String(data.query ?? "")}&rdquo; &rarr; {totalResults} results ({String(data.durationMs ?? 0)}ms)
          </div>

          {dist && (
            <div className="log-entry__scores">
              <div className="log-entry__score-bar-wrap">
                <span className="log-entry__score-label">score</span>
                <div className="log-entry__score-track">
                  <div
                    className="log-entry__score-fill"
                    style={{ left: `${scoreMin * 100}%`, width: `${(scoreMax - scoreMin) * 100}%` }}
                  />
                  {dist.mean !== undefined && (
                    <div className="log-entry__score-mean" style={{ left: `${dist.mean * 100}%` }} title={`mean ${dist.mean}`} />
                  )}
                </div>
                <span className="log-entry__score-range">{scoreMin.toFixed(2)}–{scoreMax.toFixed(2)}</span>
              </div>
            </div>
          )}

          {semanticOnly !== null && keywordMatches !== null && (
            <div className="log-entry__semantic">
              <span className="log-entry__semantic-pill log-entry__semantic-pill--semantic">
                {semanticOnly} semantic-only
              </span>
              {keywordMatches > 0 && (
                <span className="log-entry__semantic-pill log-entry__semantic-pill--keyword">
                  {keywordMatches} keyword match
                </span>
              )}
              {semanticOnly > 0 && (
                <span className="log-entry__semantic-note">
                  ↑ found without matching the query words
                </span>
              )}
            </div>
          )}

          {hasExpand && (
            <div className={`log-entry__expand${expanded ? " log-entry__expand--open" : ""}`}>
              <div className="log-entry__results">
                {topResults.map((r, i) => (
                  <div key={i} className="log-entry__result-item">
                    <div className="log-entry__result-meta">
                      {r.matchedByKeyword ? (
                        <span className="log-entry__kw-dot log-entry__kw-dot--match" title="title contains query word" />
                      ) : (
                        <span className="log-entry__kw-dot log-entry__kw-dot--semantic" title="found semantically" />
                      )}
                      <span className="log-entry__result-title">{String(r.title ?? i)}</span>
                    </div>
                    <div className="log-entry__result-right">
                      {!!r.genres && <span className="log-entry__result-genres">{String(r.genres)}</span>}
                      <span className="log-entry__result-score">{typeof r.score === "number" ? r.score.toFixed(3) : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="log-entry__legend">
                <span className="log-entry__kw-dot log-entry__kw-dot--match" /> keyword match &nbsp;
                <span className="log-entry__kw-dot log-entry__kw-dot--semantic" /> semantic only
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === "llm-prompt") {
    return (
      <div className="log-entry log-entry--llm-prompt">
        <div className="log-entry__icon"><CpuIcon /></div>
        <div className="log-entry__content">
          <div className="log-entry__header">
            <span className="log-entry__title">{String(data.model ?? "LLM")}</span>
            <span className={`log-entry__badge ${data.useRag ? "log-entry__badge--rag" : "log-entry__badge--no-rag"}`}>
              {data.useRag ? "RAG" : "no RAG"}
            </span>
            <span className="log-entry__time">{time}</span>
          </div>
          <div className="log-entry__body">
            {String(data.contextBookCount ?? 0)} books in context &mdash; {String(data.systemPromptLength ?? 0)} char prompt
          </div>
        </div>
      </div>
    );
  }

  if (type === "llm-response") {
    const usage = data.usage as { inputTokens?: number; outputTokens?: number } | undefined;
    return (
      <div className="log-entry log-entry--llm-response">
        <div className="log-entry__icon"><CheckIcon /></div>
        <div className="log-entry__content">
          <div className="log-entry__header">
            <span className="log-entry__title">Response ready</span>
            {!data.jsonParsed && (
              <span className="log-entry__badge log-entry__badge--warning">JSON repair used</span>
            )}
            <span className="log-entry__time">{time}</span>
          </div>
          <div className="log-entry__body">
            {String(data.recommendationCount ?? 0)} recommendations in {String(data.durationMs ?? 0)}ms
            {typeof data.unverifiedCount === "number" && data.unverifiedCount > 0 && (
              <span className="log-entry__unverified" style={{ marginLeft: 6 }}>
                {data.unverifiedCount} unverified
              </span>
            )}
          </div>
          {usage && (
            <div className="log-entry__tokens">
              {usage.inputTokens ?? "?"}&rarr;{usage.outputTokens ?? "?"} tokens
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function HowItWorks() {
  return (
    <div className="log-howit">
      <div className="log-howit__title">How the RAG pipeline works</div>
      <div className="log-howit__flow">
        <div className="log-howit__step">
          <div className="log-howit__node">
            <span className="log-howit__badge log-howit__badge--gray">1</span>
            <span className="log-howit__node-label">User message</span>
          </div>
        </div>
        <div className="log-howit__arrow">↓</div>
        <div className="log-howit__step">
          <div className="log-howit__node">
            <span className="log-howit__badge log-howit__badge--blue">2</span>
            <span className="log-howit__node-label">Memory Agent</span>
            <span className="log-howit__node-sub">BAAI/bge-small-en-v1.5</span>
          </div>
        </div>
        <div className="log-howit__arrow">↓</div>
        <div className="log-howit__step">
          <div className="log-howit__node">
            <span className="log-howit__badge log-howit__badge--blue">3</span>
            <span className="log-howit__node-label">Qdrant ANN search</span>
            <span className="log-howit__node-sub">cosine · 384 dims</span>
          </div>
        </div>
        <div className="log-howit__arrow">↓ top-20 candidates</div>
        <div className="log-howit__step">
          <div className="log-howit__node">
            <span className="log-howit__badge log-howit__badge--amber">4</span>
            <span className="log-howit__node-label">Decision Agent</span>
            <span className="log-howit__node-sub">qwen-2.5-7b via OpenRouter</span>
          </div>
        </div>
        <div className="log-howit__arrow">↓</div>
        <div className="log-howit__step">
          <div className="log-howit__node">
            <span className="log-howit__badge log-howit__badge--green">5</span>
            <span className="log-howit__node-label">JSON recommendations</span>
          </div>
        </div>
      </div>
      <div className="log-howit__note">
        With RAG off, the Memory Agent and Qdrant steps are skipped — the LLM answers from its training data alone. The evaluation compares both.
      </div>
    </div>
  );
}

export function LogPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"live" | "how">("live");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [hasNew, setHasNew] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    const es = new EventSource(`/api/logs/stream?sessionId=${SESSION_ID}`);
    esRef.current = es;

    es.onmessage = (ev: MessageEvent) => {
      try {
        const entry = JSON.parse(ev.data as string) as LogEntry;
        setEntries((prev) => [entry, ...prev].slice(0, 100));
        setHasNew(true);
      } catch {
        // ignore malformed
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const handleOpen = () => {
    setOpen(true);
    setHasNew(false);
  };

  const handleClose = () => setOpen(false);

  const handleClear = () => setEntries([]);

  return (
    <>
      <button className="log-trigger" onClick={handleOpen} aria-label="Open agent logs">
        <LightningIcon />
        Agent Logs
        <span className={`log-trigger__dot${hasNew ? " log-trigger__dot--active" : ""}`} />
      </button>

      <div className={`log-panel${open ? " log-panel--open" : ""}`} role="dialog" aria-label="Agent log panel">
        <div className="log-panel__header">
          <div className="log-panel__title">
            <LightningIcon />
            Agent Logs
          </div>
          <button className="log-panel__close" onClick={handleClose} aria-label="Close panel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="log-panel__tabs">
          <button
            className={`log-panel__tab${tab === "live" ? " log-panel__tab--active" : ""}`}
            onClick={() => setTab("live")}
          >
            Live Logs
          </button>
          <button
            className={`log-panel__tab${tab === "how" ? " log-panel__tab--active" : ""}`}
            onClick={() => setTab("how")}
          >
            How It Works
          </button>
        </div>

        <div className="log-panel__body">
          {tab === "live" && (
            <>
              {entries.length > 0 && (
                <div className="log-panel__toolbar">
                  <button className="log-panel__clear" onClick={handleClear}>Clear</button>
                </div>
              )}
              {entries.length === 0 && (
                <div className="log-panel__empty">Waiting for activity…</div>
              )}
              {entries.map((entry) => (
                <LogEntryRow key={entry.id} entry={entry} />
              ))}
            </>
          )}
          {tab === "how" && <HowItWorks />}
        </div>
      </div>
    </>
  );
}
