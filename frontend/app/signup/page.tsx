"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readResponseBodyJson } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-black/60">
        We&apos;ll automatically link any vendor profile, listing, or signup you&apos;ve already submitted with this
        email so you can track the status from one place.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          setSubmitting(true);
          const fd = new FormData(e.currentTarget);
          try {
            const password = String(fd.get("password") || "");
            const confirm = String(fd.get("confirm") || "");
            if (password !== confirm) {
              setErr("Passwords don't match.");
              return;
            }
            const r = await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: fd.get("email"),
                password,
              }),
            });
            const data = await readResponseBodyJson<{ detail?: string; is_admin?: boolean }>(r);
            if (!r.ok || data === null) {
              setErr(data?.detail || "Couldn't create your account.");
              return;
            }
            router.push(data.is_admin ? "/admin" : "/account");
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
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-black/50">At least 8 characters.</p>
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            className="mt-1"
            autoComplete="new-password"
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-black/60">
        Already have an account?{" "}
        <Link className="text-[var(--vrr-teal)] underline-offset-4 hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
