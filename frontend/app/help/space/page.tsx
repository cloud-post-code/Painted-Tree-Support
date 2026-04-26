"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readResponseBodyJson } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";

export default function HelpSpacePage() {
  const [msg, setMsg] = useState("");
  const { user, loading } = useCurrentUser();
  const isAuthed = !!user;
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Offer space</h1>
      {isAuthed && (
        <p className="mt-3 rounded-md bg-[var(--vrr-cream)] px-3 py-2 text-sm">
          Signed in as <strong>{user.email}</strong>. This offer will be linked to your account.
        </p>
      )}
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const body = Object.fromEntries(fd.entries()) as Record<string, unknown>;
          if (isAuthed) delete body.contact_email;
          const r = await fetch("/api/bff/v1/supporters/space", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, hcaptcha_token: null }),
          });
          const data = await readResponseBodyJson<unknown>(r);
          if (data === null) {
            setMsg(
              r.status >= 502
                ? "Service temporarily unavailable. Please try again in a few minutes."
                : `Something went wrong (${r.status}).`,
            );
            return;
          }
          setMsg(r.ok ? "Submitted — pending review." : JSON.stringify(data));
        }}
      >
        <div>
          <Label>Space type</Label>
          <Input name="space_type" required className="mt-1" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>City</Label>
            <Input name="location_city" required className="mt-1" />
          </div>
          <div>
            <Label>State</Label>
            <Input name="location_state" maxLength={2} required className="mt-1" />
          </div>
        </div>
        <div>
          <Label>Cost</Label>
          <select name="cost_tier" className="mt-1 w-full rounded-lg border p-2" required>
            <option value="free">Free</option>
            <option value="reduced">Reduced</option>
            <option value="market">Market</option>
          </select>
        </div>
        <div>
          <Label>Availability</Label>
          <Textarea name="availability_text" required className="mt-1" />
        </div>
        <div>
          <Label>Contact phone</Label>
          <Input name="contact_phone" type="tel" autoComplete="tel" placeholder="Optional" className="mt-1" />
        </div>
        {!isAuthed && !loading && (
          <div>
            <Label>Contact email</Label>
            <Input name="contact_email" type="email" required className="mt-1" />
          </div>
        )}
        <div>
          <Label>Description</Label>
          <Textarea name="description" className="mt-1" />
        </div>
        <Button type="submit">Submit</Button>
        {msg && <p className="text-sm">{msg}</p>}
      </form>
    </div>
  );
}
