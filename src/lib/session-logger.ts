import { randomUUID } from "crypto";

export type LogEntryType = "vector-query" | "llm-prompt" | "llm-response" | "route" | "error";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogEntryType;
  data: Record<string, unknown>;
}

interface SessionData {
  logs: LogEntry[];
  listeners: Set<(e: LogEntry) => void>;
  lastActivity: number;
}

const BANNED_KEYS = /key|token|secret|auth|password|authorization/i;
const MAX_LOGS = 200;
const SESSION_TTL = 10 * 60 * 1000;

const sessions = new Map<string, SessionData>();

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (BANNED_KEYS.test(k)) continue;
    result[k] = v;
  }
  return result;
}

function getOrCreate(sessionId: string): SessionData {
  let session = sessions.get(sessionId);
  if (!session) {
    session = { logs: [], listeners: new Set(), lastActivity: Date.now() };
    sessions.set(sessionId, session);
  }
  return session;
}

export function sessionLog(
  sessionId: string,
  type: LogEntryType,
  data: Record<string, unknown>
): void {
  const session = getOrCreate(sessionId);
  session.lastActivity = Date.now();

  const entry: LogEntry = {
    id: randomUUID(),
    timestamp: Date.now(),
    type,
    data: sanitize(data),
  };

  if (session.logs.length >= MAX_LOGS) {
    session.logs.shift();
  }
  session.logs.push(entry);

  for (const cb of session.listeners) {
    cb(entry);
  }
}

export function getSessionLogs(sessionId: string): LogEntry[] {
  return sessions.get(sessionId)?.logs ?? [];
}

export function subscribeSession(
  sessionId: string,
  cb: (entry: LogEntry) => void
): () => void {
  const session = getOrCreate(sessionId);
  session.listeners.add(cb);
  return () => {
    session.listeners.delete(cb);
  };
}

setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL;
  for (const [id, session] of sessions) {
    if (session.lastActivity < cutoff) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();
