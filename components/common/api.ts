/**
 * Shared API fetch utility.
 * Each role App calls this with its own token — no global state.
 */
export const API_BASE = 'http://localhost:4000';

export async function apiCall(
  path: string,
  opts: RequestInit = {},
  token?: string | null,
): Promise<any> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> | undefined),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : data.message ?? 'Request failed',
    );
  }
  return data;
}
