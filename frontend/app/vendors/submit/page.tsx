"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";

export default function VendorSubmitPage() {
  const [msg, setMsg] = useState("");
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Submit your vendor profile</h1>
      <p className="mt-2 text-sm text-black/70">Up to 4 shop links. Profiles are reviewed before going live.</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const shop_links = [];
          for (let i = 1; i <= 4; i++) {
            const l = fd.get(`label${i}`) as string;
            const u = fd.get(`url${i}`) as string;
            if (u) shop_links.push({ label: l || `Link ${i}`, url: u });
          }
          const body = {
            brand_name: fd.get("brand_name"),
            category: fd.get("category"),
            city: fd.get("city"),
            state: fd.get("state"),
            bio_150: fd.get("bio_150"),
            shop_links,
            submitted_email: fd.get("submitted_email"),
            hcaptcha_token: null,
          };
          const r = await fetch(apiUrl("/api/v1/vendors"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await r.json();
          setMsg(r.ok ? "Received — pending review." : data.detail || "Error");
        }}
      >
        <div>
          <Label>Brand name</Label>
          <Input name="brand_name" required className="mt-1" />
        </div>
        <div>
          <Label>Category</Label>
          <select name="category" className="mt-1 w-full rounded-lg border p-2" required>
            {["jewelry", "food", "clothing", "art", "beauty", "home", "other"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>City</Label>
            <Input name="city" required className="mt-1" />
          </div>
          <div>
            <Label>State</Label>
            <Input name="state" maxLength={2} required className="mt-1" />
          </div>
        </div>
        <div>
          <Label>Bio (max 150 characters)</Label>
          <Textarea name="bio_150" maxLength={160} required className="mt-1" rows={3} />
        </div>
        <div>
          <Label>Your email (for updates)</Label>
          <Input name="submitted_email" type="email" required className="mt-1" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>Link {i} label</Label>
              <Input name={`label${i}`} className="mt-1" />
            </div>
            <div>
              <Label>Link {i} URL</Label>
              <Input name={`url${i}`} type="url" className="mt-1" />
            </div>
          </div>
        ))}
        <Button type="submit">Submit</Button>
        {msg && <p className="text-sm">{msg}</p>}
      </form>
    </div>
  );
}
