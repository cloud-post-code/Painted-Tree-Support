"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

type Ann = { id: number; body: string; link_url?: string | null; link_text?: string | null; dismissible: boolean };

export function AnnouncementBanner() {
  const [items, setItems] = useState<Ann[]>([]);
  const [hidden, setHidden] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const raw = localStorage.getItem("vrr_dismissed_announcements");
    if (raw) {
      try {
        setHidden(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    fetch(apiUrl("/api/v1/announcements/active"))
      .then((r) => r.json())
      .then((d: Ann[]) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);

  const visible = items.filter((a) => !hidden[a.id]);

  const dismiss = (id: number) => {
    const next = { ...hidden, [id]: true };
    setHidden(next);
    localStorage.setItem("vrr_dismissed_announcements", JSON.stringify(next));
  };

  if (!visible.length) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-950">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2 sm:px-6">
        <div className="flex-1 text-sm">
          {visible.map((a) => (
            <p key={a.id}>
              {a.body}
              {a.link_url && a.link_text && (
                <>
                  {" "}
                  <Link href={a.link_url} className="font-semibold underline" target="_blank" rel="noreferrer">
                    {a.link_text}
                  </Link>
                </>
              )}
            </p>
          ))}
        </div>
        {visible[0]?.dismissible && (
          <button
            type="button"
            aria-label="Dismiss"
            className={cn("rounded p-1 hover:bg-amber-100")}
            onClick={() => dismiss(visible[0].id)}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
