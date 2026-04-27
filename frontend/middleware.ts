import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Split deploy: browser uses same host (`NEXT_PUBLIC_API_URL=same`) but API runs on another URL — proxy API traffic at the edge. */
function rewriteToRemoteApi(request: NextRequest): NextResponse | null {
  const pub = process.env.NEXT_PUBLIC_API_URL || "";
  const browserSameHost = pub === "same" || pub === "";
  if (!browserSameHost) return null;

  const internal = (process.env.API_INTERNAL_URL || "").trim().replace(/\/$/, "");
  if (!internal.startsWith("http")) return null;

  let internalOrigin: URL;
  try {
    internalOrigin = new URL(internal.endsWith("/") ? internal : `${internal}/`);
  } catch {
    return null;
  }
  // Do not rewrite to the same origin as this app (would loop or no-op). Allow localhost:8000 ↔ app on :3000, etc.
  if (internalOrigin.origin === request.nextUrl.origin) return null;

  const { pathname } = request.nextUrl;
  const proxyPaths =
    pathname.startsWith("/api/v1") ||
    pathname.startsWith("/static/") ||
    pathname === "/openapi.json" ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/redoc");
  if (!proxyPaths) return null;

  try {
    const dest = new URL(pathname + request.nextUrl.search, internalOrigin);
    return NextResponse.rewrite(dest);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const apiRewrite = rewriteToRemoteApi(request);
  if (apiRewrite) return apiRewrite;

  const accessToken = request.cookies.get("access_token")?.value;
  const isAdmin = request.cookies.get("is_admin")?.value === "1";

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/admin")) {
    if (!accessToken || !isAdmin) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }
  if (pathname.startsWith("/account")) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/account",
    "/account/:path*",
    "/api/v1/:path*",
    "/static/:path*",
    "/openapi.json",
    "/docs",
    "/docs/:path*",
    "/redoc",
    "/redoc/:path*",
  ],
};
