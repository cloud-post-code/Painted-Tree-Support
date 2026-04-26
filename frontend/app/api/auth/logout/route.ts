import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("access_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set("is_admin", "", { httpOnly: false, path: "/", maxAge: 0 });
  return res;
}
