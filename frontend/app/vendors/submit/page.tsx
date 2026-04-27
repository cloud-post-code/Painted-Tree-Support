"use client";

import { useState } from "react";
import { VendorImageUpload } from "@/components/vendor-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readResponseBodyJson } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";

export default function VendorSubmitPage() {
  const [msg, setMsg] = useState("");
  const [productImage, setProductImage] = useState<string | null>(null);
  const { user, loading } = useCurrentUser();
  const isAuthed = !!user;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Submit your vendor listing</h1>
      <p className="mt-2 text-sm text-black/70">
        Use the eight product fields below (same names as our CSV template). Only <strong>productName</strong> is
        required. Profiles are reviewed before going live.
      </p>
      {isAuthed && (
        <p className="mt-3 rounded-md bg-[var(--vrr-cream)] px-3 py-2 text-sm">
          Signed in as <strong>{user.email}</strong>. This profile will be linked to your account.
        </p>
      )}
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const productName = String(fd.get("productName") || "").trim();
          if (!productName) {
            setMsg("Please enter productName.");
            return;
          }
          const body: Record<string, unknown> = {
            productName,
            productDescription: String(fd.get("productDescription") || "").trim() || null,
            productPrice: String(fd.get("productPrice") || "").trim() || null,
            productCategory: String(fd.get("productCategory") || "").trim() || "other",
            productStock: String(fd.get("productStock") || "").trim() || null,
            productImage,
            productBrand: String(fd.get("productBrand") || "").trim() || null,
            productRating: String(fd.get("productRating") || "").trim() || null,
            shop_links: [],
            hcaptcha_token: null,
          };
          if (!isAuthed) {
            body.submitted_email = fd.get("submitted_email");
          }
          const r = await fetch("/api/bff/v1/vendors", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await readResponseBodyJson<{ detail?: string }>(r);
          if (data === null) {
            setMsg(
              r.status >= 502
                ? "Service temporarily unavailable. Please try again in a few minutes."
                : "Could not submit. Please try again.",
            );
            return;
          }
          setMsg(r.ok ? "Received — pending review." : data.detail || "Error");
        }}
      >
        <div>
          <Label htmlFor="productName">productName</Label>
          <Input id="productName" name="productName" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="productDescription">productDescription</Label>
          <Textarea id="productDescription" name="productDescription" rows={4} className="mt-1" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="productPrice">productPrice</Label>
            <Input id="productPrice" name="productPrice" className="mt-1" placeholder="e.g. 19.99" />
          </div>
          <div>
            <Label htmlFor="productCategory">productCategory</Label>
            <Input id="productCategory" name="productCategory" className="mt-1" placeholder="e.g. Electronics" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="productStock">productStock</Label>
            <Input id="productStock" name="productStock" className="mt-1" placeholder="e.g. 50" />
          </div>
          <div>
            <Label htmlFor="productBrand">productBrand</Label>
            <Input id="productBrand" name="productBrand" className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="productRating">productRating</Label>
          <Input id="productRating" name="productRating" className="mt-1" placeholder="e.g. 4.8" />
        </div>
        <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 space-y-4">
          <p className="text-sm font-medium text-black/80">productImage (optional — URL or upload)</p>
          <VendorImageUpload kind="banner" value={productImage} onChange={setProductImage} />
        </div>
        {!isAuthed && !loading && (
          <div>
            <Label htmlFor="submitted_email">Your email (for updates)</Label>
            <Input id="submitted_email" name="submitted_email" type="email" required className="mt-1" />
          </div>
        )}
        <Button type="submit">Submit</Button>
        {msg && <p className="text-sm">{msg}</p>}
      </form>
    </div>
  );
}
