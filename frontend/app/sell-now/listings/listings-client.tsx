"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackEvent } from "@/lib/analytics";

type Listing = {
  id: number;
  type: string;
  brand_or_space_name: string;
  location_city: string;
  location_state: string;
  cost_tier: string;
  availability_text: string;
  description?: string | null;
};

export function ListingsClient() {
  const [booths, setBooths] = useState<Listing[]>([]);
  const [seekers, setSeekers] = useState<Listing[]>([]);
  const [msg, setMsg] = useState("");

  const load = () => {
    void fetch(apiUrl("/api/v1/listings?type=booth_offer"))
      .then((r) => r.json())
      .then(setBooths);
    void fetch(apiUrl("/api/v1/listings?type=vendor_seeking"))
      .then((r) => r.json())
      .then(setSeekers);
  };

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      type: fd.get("type"),
      brand_or_space_name: fd.get("brand_or_space_name"),
      location_city: fd.get("location_city"),
      location_state: fd.get("location_state"),
      cost_tier: fd.get("cost_tier"),
      availability_text: fd.get("availability_text"),
      contact_email: fd.get("contact_email"),
      description: fd.get("description") || null,
      hcaptcha_token: null as string | null,
    };
    const r = await fetch(apiUrl("/api/v1/listings"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) {
      setMsg(data.detail || "Error");
      return;
    }
    trackEvent("listing_submit", { id: data.id });
    setMsg("Submitted — pending review. Thank you.");
    e.currentTarget.reset();
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-2">
      <div>
        <h2 className="text-xl font-semibold">Available booths / spaces</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {booths.map((b) => (
            <li key={b.id} className="rounded-lg border border-black/10 p-3">
              <p className="font-semibold">{b.brand_or_space_name}</p>
              <p>
                {b.location_city}, {b.location_state} · {b.cost_tier}
              </p>
              <p className="text-black/70">{b.availability_text}</p>
            </li>
          ))}
          {!booths.length && <p className="text-black/50">No published listings yet.</p>}
        </ul>
      </div>
      <div>
        <h2 className="text-xl font-semibold">Vendors seeking space</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {seekers.map((b) => (
            <li key={b.id} className="rounded-lg border border-black/10 p-3">
              <p className="font-semibold">{b.brand_or_space_name}</p>
              <p>
                {b.location_city}, {b.location_state}
              </p>
              <p className="text-black/70">{b.availability_text}</p>
            </li>
          ))}
          {!seekers.length && <p className="text-black/50">No published listings yet.</p>}
        </ul>
      </div>
      <div className="lg:col-span-2">
        <h2 className="text-xl font-semibold">Post a listing</h2>
        <form className="mt-4 grid max-w-xl gap-3" onSubmit={submit}>
          <div>
            <Label>Type</Label>
            <select name="type" className="mt-1 w-full rounded-lg border border-black/15 p-2" required>
              <option value="booth_offer">Booth / space available</option>
              <option value="vendor_seeking">Vendor seeking space</option>
            </select>
          </div>
          <div>
            <Label>Name / space</Label>
            <Input name="brand_or_space_name" required className="mt-1" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>City</Label>
              <Input name="location_city" required className="mt-1" />
            </div>
            <div>
              <Label>State</Label>
              <Input name="location_state" required maxLength={2} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Cost</Label>
            <select name="cost_tier" className="mt-1 w-full rounded-lg border border-black/15 p-2" required>
              <option value="free">Free</option>
              <option value="reduced">Reduced</option>
              <option value="market">Market rate</option>
            </select>
          </div>
          <div>
            <Label>Availability</Label>
            <Textarea name="availability_text" required className="mt-1" />
          </div>
          <div>
            <Label>Contact email</Label>
            <Input name="contact_email" type="email" required className="mt-1" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea name="description" className="mt-1" />
          </div>
          <Button type="submit">Submit</Button>
          {msg && <p className="text-sm">{msg}</p>}
        </form>
      </div>
    </div>
  );
}
