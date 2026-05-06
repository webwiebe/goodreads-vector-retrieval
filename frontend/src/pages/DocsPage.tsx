import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiFetch } from "../lib/session";
import type { DocMeta, DocContent } from "../types";
import "./pages.css";

export function DocsPage() {
  const { name } = useParams<{ name?: string }>();
  const navigate = useNavigate();

  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [content, setContent] = useState<DocContent | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    apiFetch("/api/docs")
      .then((r) => r.json())
      .then((data: { docs: DocMeta[] }) => {
        setDocs(data.docs ?? []);
        setLoadingDocs(false);
      })
      .catch(() => setLoadingDocs(false));
  }, []);

  useEffect(() => {
    if (!name) {
      setContent(null);
      return;
    }
    setLoadingContent(true);
    apiFetch(`/api/docs/${name}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: DocContent) => {
        setContent(data);
        setLoadingContent(false);
      })
      .catch(() => {
        setContent(null);
        setLoadingContent(false);
      });
  }, [name]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) navigate(`/docs/${val}`);
    else navigate("/docs");
  };

  if (!name) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Documentation</h1>
          <p className="page-subtitle">Learn about how this system works</p>
        </div>

        {loadingDocs && (
          <div className="docs-index-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: 100 }}>
                <div className="skeleton skeleton-block" style={{ height: 18, width: "70%" }} />
                <div className="skeleton skeleton-block" style={{ height: 14, width: "40%", marginTop: 8 }} />
              </div>
            ))}
          </div>
        )}

        {!loadingDocs && docs.length === 0 && (
          <div className="empty-state">
            <p className="empty-state__title">No documentation available</p>
          </div>
        )}

        {!loadingDocs && docs.length > 0 && (
          <div className="docs-index-grid">
            {docs.map((doc) => (
              <Link key={doc.name} to={`/docs/${doc.name}`} className="docs-index-card">
                <div className="docs-index-card__title">{doc.title}</div>
                <div className="docs-index-card__name">{doc.name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-sep">›</span>
        <Link to="/docs">Docs</Link>
        {content && (
          <>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{content.title}</span>
          </>
        )}
      </nav>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="docs-sidebar-title">Documentation</div>
          {docs.map((doc) => (
            <Link
              key={doc.name}
              to={`/docs/${doc.name}`}
              className={`docs-sidebar-link${doc.name === name ? " docs-sidebar-link--active" : ""}`}
            >
              {doc.title}
            </Link>
          ))}
        </aside>

        <div className="docs-content">
          <select
            className="docs-select"
            value={name ?? ""}
            onChange={handleSelectChange}
          >
            <option value="">— Select a doc —</option>
            {docs.map((doc) => (
              <option key={doc.name} value={doc.name}>
                {doc.title}
              </option>
            ))}
          </select>

          {loadingContent && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-block" style={{ height: i % 3 === 0 ? 24 : 14, width: `${60 + Math.random() * 35}%` }} />
              ))}
            </div>
          )}

          {!loadingContent && !content && (
            <div className="empty-state">
              <p className="empty-state__title">Document not found</p>
              <Link to="/docs" className="back-link" style={{ marginTop: 16 }}>← Back to docs</Link>
            </div>
          )}

          {!loadingContent && content && (
            <>
              <h1 className="page-title" style={{ marginBottom: 24 }}>{content.title}</h1>
              <div className="markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content.content}
                </ReactMarkdown>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
