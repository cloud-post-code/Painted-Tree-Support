import { NextResponse } from "next/server";
import { internalBackendUrl, readResponseBodyJson } from "@/lib/api";

type RegisterPayload = {
  email?: string;
  password?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as RegisterPayload;
  const { email, password } = body || {};
  const r = await fetch(`${internalBackendUrl()}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await readResponseBodyJson<{
    access_token?: string;
    email?: string;
    is_admin?: boolean;
    detail?: unknown;
  }>(r);
  if (data === null) {
    return NextResponse.json(
      { detail: r.status >= 502 ? "API temporarily unavailable" : "Invalid response from API" },
      { status: !r.ok ? r.status : 502 },
    );
  }
  if (!r.ok) {
    return NextResponse.json(data, { status: r.status });
  }
  const token = data.access_token;
  if (!token) {
    return NextResponse.json({ detail: "No token from API" }, { status: 502 });
  }
  const isAdmin = Boolean(data.is_admin);
  const res = NextResponse.json({ email: data.email, is_admin: isAdmin });
  const maxAge = 60 * 60 * 24 * 30;
  res.cookies.set("access_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  });
  res.cookies.set("is_admin", isAdmin ? "1" : "0", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
