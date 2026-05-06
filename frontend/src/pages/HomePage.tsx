import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Chat } from "../components/Chat";
import type { ChatMessage, UIMessage, HealthStatus, ChatResponse, GenreSummary } from "../types";
import "./pages.css";
import "../App.css";

interface Props {
  useRag: boolean;
  health: HealthStatus | null;
  healthError: boolean;
  language?: string;
}

function GenreCoverThumb({ url, title }: { url: string; title: string }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div className="genre-card__cover">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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

export function HomePage({ useRag, health: _health, healthError: _healthError, language = "any" }: Props) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [genres, setGenres] = useState<GenreSummary[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/genres?limit=6")
      .then((r) => r.json())
      .then((data: { genres: GenreSummary[] }) => setGenres(data.genres ?? []))
      .catch(() => {});
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, useRag, language: language !== "any" ? language : undefined }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      let data: ChatResponse = await res.json();

      if (
        typeof data.response === "string" &&
        data.response.trimStart().startsWith("{") &&
        !data.recommendations
      ) {
        try {
          const reparsed = JSON.parse(data.response) as ChatResponse;
          if (reparsed.response || reparsed.recommendations) data = reparsed;
        } catch { /* leave as-is */ }
      }

      const assistantMsg: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "Here are some recommendations for you.",
        recommendations: data.recommendations,
        sources: data.sources,
        follow_up_question: data.follow_up_question,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, messages, useRag]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFollowUp = (question: string) => {
    setInput(question);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const hasMessages = messages.length > 0 || loading;

  return (
    <div className="app" style={{ height: "calc(100dvh - 52px)" }}>
      <main className="main" style={hasMessages ? undefined : { overflow: "auto" }}>
        {!hasMessages && (
          <div className="welcome-sections">
            <div>
              <div className="section-header">
                <span className="section-title">Learn how it works</span>
                <Link to="/docs" className="section-link">All docs →</Link>
              </div>
              <div className="welcome-doc-cards">
                <Link to="/docs/vector-vs-keyword-search" className="welcome-doc-card">
                  <div className="welcome-doc-card__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                      <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="welcome-doc-card__text">
                    <h4>Vector vs Keyword Search</h4>
                    <p>How semantic search compares to traditional keyword matching</p>
                  </div>
                </Link>
                <Link to="/docs/architecture" className="welcome-doc-card">
                  <div className="welcome-doc-card__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                      <rect x="16" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                      <rect x="9" y="15" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                      <path d="M5 9v3h14V9M12 12v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="welcome-doc-card__text">
                    <h4>Architecture</h4>
                    <p>System design, RAG pipeline and vector database setup</p>
                  </div>
                </Link>
              </div>
            </div>

            {genres.length > 0 && (
              <div>
                <div className="section-header">
                  <span className="section-title">Browse by Genre</span>
                  <Link to="/genres" className="section-link">All genres →</Link>
                </div>
                <div className="welcome-genre-grid">
                  {genres.map((g) => (
                    <Link
                      key={g.name}
                      to={`/genres/${encodeURIComponent(g.name)}`}
                      className="welcome-genre-card"
                    >
                      <div className="welcome-genre-card__covers">
                        {g.topBooks.slice(0, 3).map((b) => (
                          <GenreCoverThumb key={b.work_id} url={b.image_url} title={b.title} />
                        ))}
                      </div>
                      <div className="welcome-genre-card__name">{g.name}</div>
                      <div className="welcome-genre-card__count">{g.count.toLocaleString()} books</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Chat messages={messages} loading={loading} onFollowUp={handleFollowUp} language={language} />
      </main>

      <footer className="input-area">
        <div className="input-area-inner">
          <textarea
            ref={inputRef}
            className="input-box"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for book recommendations…"
            rows={1}
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
        <p className="input-hint">Enter to send · Shift+Enter for new line</p>
      </footer>
    </div>
  );
}
