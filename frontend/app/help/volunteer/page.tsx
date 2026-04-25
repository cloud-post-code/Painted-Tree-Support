"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";

export default function VolunteerPage() {
  const [msg, setMsg] = useState("");
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Volunteer</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const skills = (fd.get("skills") as string).split(",").map((s) => s.trim()).filter(Boolean);
          const body = {
            name: fd.get("name"),
            email: fd.get("email"),
            skills,
            availability: fd.get("availability"),
            areas_of_interest: fd.get("areas_of_interest"),
            hcaptcha_token: null,
          };
          const r = await fetch(apiUrl("/api/v1/supporters/volunteer"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await r.json();
          setMsg(r.ok ? "Thanks — we will follow up." : JSON.stringify(data));
        }}
      >
        <div>
          <Label>Name</Label>
          <Input name="name" required className="mt-1" />
        </div>
        <div>
          <Label>Email</Label>
          <Input name="email" type="email" required className="mt-1" />
        </div>
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
