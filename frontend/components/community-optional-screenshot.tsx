"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CommunityOptionalScreenshotProps = {
  src: string;
  alt: string;
  /** e.g. aspect-[4/3] — controls layout height; card must be `relative` */
  aspectClassName: string;
  className?: string;
};

/**
 * Tries to load a screenshot from /public. If the file is missing or fails, shows a
 * static placeholder so the page still looks polished until assets are added.
 */
export function CommunityOptionalScreenshot({
  src,
  alt,
  aspectClassName,
  className,
}: CommunityOptionalScreenshotProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 border border-dashed border-black/15 bg-gradient-to-b from-slate-100/90 to-slate-200/80 p-6 text-center",
          aspectClassName,
          className,
        )}
        role="img"
        aria-label={alt || "Community screenshot (placeholder)"}
      >
        <ImageIcon className="h-7 w-7 text-black/25" strokeWidth={1.25} aria-hidden />
        <p className="text-sm font-medium text-black/50">Screenshot coming soon</p>
        <p className="max-w-xs text-xs text-black/40">
          Add a JPG in <code className="break-all rounded bg-black/5 px-1.5 py-0.5 text-[0.7rem]">public{src}</code>{" "}
          then refresh.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-white/80 shadow-lg ring-1 ring-black/10",
        aspectClassName,
        className,
      )}
    >
      {/* User-supplied public/*.jpg: plain img + onError when file missing; next/image not a fit. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- optional local /public assets */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover object-top"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
