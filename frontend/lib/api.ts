function sameOriginApi(): boolean {
  const v = process.env.NEXT_PUBLIC_API_URL;
  return v === "same" || v === "";
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

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(apiUrl(path), {
    ...init,
    next: { revalidate: 60 },
  });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json() as Promise<T>;
}

export async function apiGetNoStore<T>(path: string): Promise<T> {
  const r = await fetch(apiUrl(path), { cache: "no-store" });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json() as Promise<T>;
}
