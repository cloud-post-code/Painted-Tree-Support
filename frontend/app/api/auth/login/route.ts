import { NextResponse } from "next/server";
import { internalBackendUrl } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json();
  const r = await fetch(`${internalBackendUrl()}/api/v1/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) {
    return NextResponse.json(data, { status: r.status });
  }
  const token = data.access_token as string | undefined;
  if (!token) {
    return NextResponse.json({ detail: "No token from API" }, { status: 502 });
  }
  const res = NextResponse.json({ email: data.email });
  const maxAge = 60 * 60 * 24 * 30;
  res.cookies.set("access_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
