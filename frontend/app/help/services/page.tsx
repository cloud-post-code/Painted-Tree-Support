"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";

export default function HelpServicesPage() {
  const [msg, setMsg] = useState("");
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Offer services</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const body = Object.fromEntries(fd.entries());
          const r = await fetch(apiUrl("/api/v1/supporters/services"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, hcaptcha_token: null }),
          });
          const data = await r.json();
          setMsg(r.ok ? "Submitted — pending review." : JSON.stringify(data));
        }}
      >
        <div>
          <Label>Service type</Label>
          <select name="service_type" className="mt-1 w-full rounded-lg border p-2" required>
            <option value="marketing">Marketing</option>
            <option value="legal">Legal</option>
            <option value="logistics">Logistics</option>
            <option value="tech">Tech</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <Label>Availability</Label>
          <Textarea name="availability" required className="mt-1" />
        </div>
        <div>
          <Label>Cost</Label>
          <select name="cost_tier" className="mt-1 w-full rounded-lg border p-2" required>
            <option value="pro_bono">Pro bono</option>
            <option value="reduced">Reduced</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div>
          <Label>Contact phone</Label>
          <Input name="contact_phone" type="tel" autoComplete="tel" placeholder="Optional" className="mt-1" />
        </div>
        <div>
          <Label>Contact email</Label>
          <Input name="contact_email" type="email" required className="mt-1" />
        </div>
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
