// lib/api.ts
export const API_BASE = "https://api.emipar.life";

async function parseError(res: Response): Promise<string> {
  try {
    const j = await res.json();

    if (typeof j?.error === "string") {
      return j.error;
    }

    if (typeof j?.message === "string") {
      return j.message;
    }

    if (j?.error?.error?.message) {
      return j.error.error.message;
    }

    if (j?.error?.message) {
      return j.error.message;
    }

    return JSON.stringify(j);
  } catch {
    try {
      return await res.text();
    } catch {
      return "Erro desconhecido";
    }
  }
}

function getBrowserToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("crm_token");
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");

  const token = getBrowserToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const msg = await parseError(res);
    throw new Error(msg || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}