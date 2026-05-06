import type { UIMessage } from "../types";

const KEY = "chat-messages";

export function saveChatMessages(messages: UIMessage[]): void {
  if (messages.length === 0) {
    sessionStorage.removeItem(KEY);
    return;
  }
  const trimmed = messages.slice(-40).map((m) => ({
    ...m,
    sources: undefined,
  }));
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full — skip
  }
}

export function loadChatMessages(): UIMessage[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UIMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasChatHistory(): boolean {
  return loadChatMessages().length > 0;
}

export function clearChatHistory(): void {
  sessionStorage.removeItem(KEY);
}
