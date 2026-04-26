"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiUrl, resolveMediaUrl } from "@/lib/api";
import { getCroppedImgAsJpeg } from "@/lib/cropImage";
import { cn } from "@/lib/utils";

type Kind = "logo" | "banner";

const ASPECT: Record<Kind, number> = {
  logo: 1,
  banner: 2,
};

const COPY: Record<Kind, { title: string; hint: string; output: string }> = {
  logo: {
    title: "Logo",
    hint: "Square works best. Drag to frame your mark — we save a 512×512 image.",
    output: "Saved as 512×512 px (square).",
  },
  banner: {
    title: "Banner / hero image",
    hint: "Wide image for your profile header. Drag to frame — we save 1200×600 px (2∶1).",
    output: "Saved as 1200×600 px (2∶1).",
  },
};

type Props = {
  kind: Kind;
  value: string | null;
  onChange: (url: string | null) => void;
};

export function VendorImageUpload({ kind, value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const close = () => {
    setOpen(false);
    if (imageSrc?.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setCroppedAreaPixels(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setErr(null);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) {
      setErr("Choose an image file.");
      return;
    }
    setErr(null);
    const url = URL.createObjectURL(f);
    setImageSrc(url);
    setOpen(true);
  };

  const confirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setBusy(true);
    setErr(null);
    try {
      const blob = await getCroppedImgAsJpeg(imageSrc, croppedAreaPixels);
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", blob, `${kind}.jpg`);
      const r = await fetch(apiUrl("/api/v1/vendors/upload-image"), {
        method: "POST",
        body: fd,
      });
      const data = (await r.json()) as { url?: string; detail?: unknown };
      if (!r.ok) {
        const d = data.detail;
        setErr(typeof d === "string" ? d : "Upload failed");
        setBusy(false);
        return;
      }
      if (!data.url) {
        setErr("No URL returned");
        setBusy(false);
        return;
      }
      onChange(data.url);
      close();
    } catch {
      setErr("Could not process image");
    }
    setBusy(false);
  };

  const c = COPY[kind];
  const preview = resolveMediaUrl(value);
  const inputId = `vendor-image-${kind}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{c.title}</Label>
      <p id={`${inputId}-hint`} className="text-xs text-black/55">
        {c.hint}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-describedby={`${inputId}-hint`}
          onChange={onPickFile}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          {value ? "Replace image" : "Upload image"}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        ) : null}
      </div>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className={cn(
            "mt-2 border border-black/10 object-cover",
            kind === "logo" ? "size-24 rounded-lg" : "h-24 w-full max-w-md rounded-lg",
          )}
        />
      ) : null}
      <p className="text-xs text-black/45">{c.output}</p>
      {err ? <p className="text-xs text-red-700">{err}</p> : null}

      {open && imageSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white p-4 shadow-lg">
            <p className="text-sm font-semibold">Adjust crop</p>
            <p className="text-xs text-black/60">Pinch or use the slider to zoom. Drag to move.</p>
            <div className="relative mt-3 h-72 w-full overflow-hidden rounded-lg bg-neutral-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={ASPECT[kind]}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-black/70">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void confirmCrop()} disabled={busy || !croppedAreaPixels}>
                {busy ? "Uploading…" : "Save & upload"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
