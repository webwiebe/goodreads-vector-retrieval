export const SESSION_ID: string = (() => {
  const KEY = "rag-session-id";
  let id = sessionStorage.getItem(KEY);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(KEY, id); }
  return id;
})();

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), "X-Session-ID": SESSION_ID },
  });
}
