import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Nav } from "./components/Nav";
import { HomePage } from "./pages/HomePage";
import { GenresPage } from "./pages/GenresPage";
import { GenreDetailPage } from "./pages/GenreDetailPage";
import { BookDetailPage } from "./pages/BookDetailPage";
import { AuthorDetailPage } from "./pages/AuthorDetailPage";
import { DocsPage } from "./pages/DocsPage";
import { LogPanel } from "./components/LogPanel";
import { apiFetch } from "./lib/session";
import type { HealthStatus } from "./types";
import "./App.css";

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [useRag, setUseRag] = useState(true);
  const [language, setLanguage] = useState("any");

  useEffect(() => {
    apiFetch("/api/health")
      .then((r) => r.json())
      .then((data: HealthStatus) => {
        setHealth(data);
        setHealthError(false);
      })
      .catch(() => setHealthError(true));
  }, []);

  return (
    <BrowserRouter>
      <Nav
        health={health}
        useRag={useRag}
        onRagToggle={setUseRag}
        language={language}
        onLanguageChange={setLanguage}
      />
      <Routes>
        <Route path="/" element={<HomePage useRag={useRag} health={health} healthError={healthError} language={language} />} />
        <Route path="/genres" element={<GenresPage />} />
        <Route path="/genres/:genre" element={<GenreDetailPage />} />
        <Route path="/books/:workId" element={<BookDetailPage />} />
        <Route path="/authors/:authorName" element={<AuthorDetailPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/:name" element={<DocsPage />} />
      </Routes>
      <LogPanel />
    </BrowserRouter>
  );
}
