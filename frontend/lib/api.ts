function sameOriginApi(): boolean {
  const v = process.env.NEXT_PUBLIC_API_URL;
  return v === "same" || v === "";
}

/**
 * Parse JSON from a fetch Response without throwing when the body is HTML
 * (e.g. nginx/Railway 502 pages). Returns null if the body is not JSON.
 */
export async function readResponseBodyJson<T = unknown>(r: Response): Promise<T | null> {
  const text = await r.text();
  const trimmed = text.trimStart();
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!looksJson) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Base URL for server-side routes (BFF, auth) to reach FastAPI. */
export function internalBackendUrl(): string {
  const internal = process.env.API_INTERNAL_URL;
  if (internal) {
    return internal.replace(/\/$/, "");
  }
  const pub = process.env.NEXT_PUBLIC_API_URL;
  if (pub === "same" || pub === "") {
    return "http://127.0.0.1:8000";
  }
  return (pub || "http://localhost:8000").replace(/\/$/, "");
}

/** Public API / static asset base for fetch() and hrefs. */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") {
    const internal = process.env.API_INTERNAL_URL;
    if (internal) {
      return `${internal.replace(/\/$/, "")}${p}`;
    }
    if (sameOriginApi()) {
      return `http://127.0.0.1:8000${p}`;
    }
    return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${p}`;
  }
  if (sameOriginApi()) {
    return p;
  }
  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${p}`;
}

/** Use for vendor (or other) media stored as `/static/...` on the API host. */
export function resolveMediaUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return apiUrl(p);
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(apiUrl(path), {
    ...init,
    next: { revalidate: 60 },
  });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  const data = await readResponseBodyJson<T>(r);
  if (data === null) throw new Error(`GET ${path}: expected JSON`);
  return data;
}

export async function apiGetNoStore<T>(path: string): Promise<T> {
  const r = await fetch(apiUrl(path), { cache: "no-store" });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  const data = await readResponseBodyJson<T>(r);
  if (data === null) throw new Error(`GET ${path}: expected JSON`);
  return data;
}
