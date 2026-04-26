"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readResponseBodyJson } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-2 text-sm text-black/60">
        Track the status of every submission you&apos;ve made and read messages from the team.
      </p>
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
              }),
            });
            if (!r.ok) {
              setErr("Invalid email or password.");
              return;
            }
            const data = await readResponseBodyJson<{ is_admin?: boolean }>(r);
            if (data === null) {
              setErr("Unexpected response from server. Try again or contact support if this persists.");
              return;
            }
            const dest = data.is_admin ? "/admin" : next;
            router.push(dest);
            router.refresh();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1"
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1"
            autoComplete="current-password"
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-black/60">
        New here?{" "}
        <Link className="text-[var(--vrr-teal)] underline-offset-4 hover:underline" href="/signup">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
