import { useEffect, useRef } from "react";
import type { UIMessage, Recommendation } from "../types";
import { BookCard } from "./BookCard";
import "./Chat.css";

function NoRagWarning({ recommendations, useRag }: { recommendations?: Recommendation[]; useRag?: boolean }) {
  if (useRag !== false) return null;
  const unverified = (recommendations ?? []).filter((r) => r.verified === false);
  if (unverified.length === 0) return null;
  return (
    <div className="no-rag-warning">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div>
        <strong>{unverified.length} of {recommendations!.length} books could not be verified</strong> in our Goodreads dataset — the AI may have hallucinated {unverified.length === 1 ? "it" : "them"}.
        <br />
        <span className="no-rag-warning__tip">
          Enable <strong>Vector Search</strong> in the nav bar to get recommendations grounded in real books from the database.
        </span>
      </div>
    </div>
  );
}

interface Props {
  messages: UIMessage[];
  loading: boolean;
  onFollowUp: (question: string) => void;
  language?: string;
}

export function Chat({ messages, loading, onFollowUp, language = "any" }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="chat chat--empty">
        <div className="chat-welcome">
          <div className="chat-welcome__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
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
          <h2 className="chat-welcome__heading">Find your next great read</h2>
          <p className="chat-welcome__sub">
            Describe what you&apos;re in the mood for and get personalized book
            recommendations from a curated Goodreads dataset.
          </p>
          <div className="chat-welcome__suggestions">
            {[
              "I love cozy mysteries with cats and British settings",
              "Something uplifting after a hard week",
              "Hard sci-fi with no romance",
              "Books like Neil Gaiman for adults",
            ].map((s) => (
              <button
                key={s}
                className="suggestion-chip"
                onClick={() => onFollowUp(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {language && language !== "any" && (
            <div className="chat-welcome__lang-pill">
              Filtering for: <strong>{language}</strong> language books
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-row message-row--${msg.role}`}
          >
            {msg.role === "assistant" && (
              <div className="message-avatar message-avatar--assistant">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
            )}

            <div className="message-content-wrap">
              <div className={`message-bubble message-bubble--${msg.role}`}>
                {msg.content}
              </div>

              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="recommendations">
                  <p className="recommendations__label">
                    {msg.recommendations.length} recommendation
                    {msg.recommendations.length !== 1 ? "s" : ""}
                    {msg.useRag === false && (
                      <span className="recommendations__label-badge">no vector search</span>
                    )}
                  </p>
                  <div className="recommendations__grid">
                    {msg.recommendations.map((rec) => (
                      <BookCard key={rec.book.work_id || rec.book.title} recommendation={rec} />
                    ))}
                  </div>
                  <NoRagWarning recommendations={msg.recommendations} useRag={msg.useRag} />
                </div>
              )}

              {msg.follow_up_question && (
                <button
                  className="follow-up-btn"
                  onClick={() => onFollowUp(msg.follow_up_question!)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {msg.follow_up_question}
                </button>
              )}
            </div>

            {msg.role === "user" && (
              <div className="message-avatar message-avatar--user">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="message-row message-row--assistant">
            <div className="message-avatar message-avatar--assistant">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
            <div className="message-content-wrap">
              <div className="message-bubble message-bubble--assistant message-bubble--loading">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
