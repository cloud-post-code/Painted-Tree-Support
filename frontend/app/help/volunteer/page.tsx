"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readResponseBodyJson } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";

export default function VolunteerPage() {
  const [msg, setMsg] = useState("");
  const { user, loading } = useCurrentUser();
  const isAuthed = !!user;
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Volunteer</h1>
      {isAuthed && (
        <p className="mt-3 rounded-md bg-[var(--vrr-cream)] px-3 py-2 text-sm">
          Signed in as <strong>{user.email}</strong>. This signup will be linked to your account.
        </p>
      )}
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const skills = (fd.get("skills") as string).split(",").map((s) => s.trim()).filter(Boolean);
          const body: Record<string, unknown> = {
            name: fd.get("name"),
            skills,
            availability: fd.get("availability"),
            areas_of_interest: fd.get("areas_of_interest"),
            hcaptcha_token: null,
          };
          if (!isAuthed) {
            body.email = fd.get("email");
          }
          const r = await fetch("/api/bff/v1/supporters/volunteer", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
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
          setMsg(r.ok ? "Thanks — we will follow up." : JSON.stringify(data));
        }}
      >
        <div>
          <Label>Name</Label>
          <Input name="name" required className="mt-1" />
        </div>
        {!isAuthed && !loading && (
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" required className="mt-1" />
          </div>
        )}
        <div>
          <Label>Skills (comma-separated)</Label>
          <Input name="skills" className="mt-1" placeholder="writing, events, design" />
        </div>
        <div>
          <Label>Availability</Label>
          <Textarea name="availability" required className="mt-1" />
        </div>
        <div>
          <Label>Areas of interest</Label>
          <Textarea name="areas_of_interest" required className="mt-1" />
        </div>
        <Button type="submit">Submit</Button>
        {msg && <p className="text-sm">{msg}</p>}
      </form>
    </div>
  );
}
