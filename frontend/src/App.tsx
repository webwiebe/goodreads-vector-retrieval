import { useState, useEffect, useRef, useCallback } from "react";
import { Chat } from "./components/Chat";
import type { ChatMessage, UIMessage, HealthStatus, ChatResponse } from "./types";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [useRag, setUseRag] = useState(true);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data: HealthStatus) => {
        setHealth(data);
        setHealthError(false);
      })
      .catch(() => setHealthError(true));
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
        body: JSON.stringify({ messages: history, useRag }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      let data: ChatResponse = await res.json();

      // Safety net: if the backend leaked raw JSON into the response field, re-parse it
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

  const healthReady =
    health && health.status === "ok" && health.ingestionComplete;

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="header-title">Book Recommender</h1>
              <p className="header-subtitle">powered by RAG + Qdrant</p>
            </div>
          </div>

          <div className="header-controls">
            <div className="health-indicator">
              <span
                className={`health-dot ${
                  healthError
                    ? "health-dot--error"
                    : healthReady
                    ? "health-dot--ok"
                    : "health-dot--loading"
                }`}
              />
              <span className="health-label">
                {healthError
                  ? "API offline"
                  : health === null
                  ? "Connecting…"
                  : !health.ingestionComplete
                  ? "Indexing…"
                  : `${health.indexedBooks.toLocaleString()} books indexed`}
              </span>
            </div>

            <label className="rag-toggle">
              <input
                type="checkbox"
                checked={useRag}
                onChange={(e) => setUseRag(e.target.checked)}
                className="rag-toggle__input"
              />
              <span className="rag-toggle__track">
                <span className="rag-toggle__thumb" />
              </span>
              <span className="rag-toggle__label">Vector Search</span>
            </label>
          </div>
        </div>
      </header>

      <main className="main">
        <Chat
          messages={messages}
          loading={loading}
          onFollowUp={handleFollowUp}
        />
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
                <path
                  d="M22 2L11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 2L15 22L11 13L2 9L22 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
        <p className="input-hint">Enter to send · Shift+Enter for new line</p>
      </footer>
    </div>
  );
}
