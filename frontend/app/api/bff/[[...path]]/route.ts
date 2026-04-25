import { NextRequest, NextResponse } from "next/server";

const backend = () => process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function proxy(req: NextRequest, segments: string[]) {
  const path = "/api/" + segments.join("/");
  const url = `${backend()}${path}`;
  const token = req.cookies.get("access_token")?.value;
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const ct = req.headers.get("content-type");
  if (ct) (headers as Record<string, string>)["Content-Type"] = ct;
  const body =
    req.method !== "GET" && req.method !== "HEAD" ? await req.arrayBuffer() : undefined;
  const r = await fetch(url, { method: req.method, headers, body: body && body.byteLength ? body : undefined });
  const resHeaders = new Headers();
  const contentType = r.headers.get("content-type");
  if (contentType) resHeaders.set("content-type", contentType);
  return new NextResponse(await r.arrayBuffer(), { status: r.status, headers: resHeaders });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path || []);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path || []);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path || []);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path || []);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path || []);
}
