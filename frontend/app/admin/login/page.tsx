"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readResponseBodyJson } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">Admin sign in</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          setSubmitting(true);
          const fd = new FormData(e.currentTarget);
          try {
            const r = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: fd.get("email"),
                password: fd.get("password"),
                mode: "admin",
              }),
            });
            if (!r.ok) {
              const data = await readResponseBodyJson<{ detail?: string }>(r);
              if (r.status === 403) {
                setErr("This account is not an admin.");
              } else {
                setErr(data?.detail || "Invalid credentials");
              }
              return;
            }
            router.push("/admin");
            router.refresh();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="mt-1" autoComplete="username" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required className="mt-1" autoComplete="current-password" />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
