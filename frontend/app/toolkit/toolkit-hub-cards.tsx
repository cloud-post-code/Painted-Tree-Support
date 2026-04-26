"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TOOLS = [
  {
    href: "/toolkit/social",
    title: "Social captions",
    description: "Short posts for Instagram, Facebook, or TikTok after a move or relaunch.",
  },
  {
    href: "/toolkit/email",
    title: "Email announcements",
    description: "Formal, casual, and urgent tones for Mailchimp, Gmail, or your list tool.",
  },
  {
    href: "/toolkit/we-moved",
    title: "“We moved” messaging kit",
    description: "PDF with key messages, FAQ ideas, graphic notes, and a simple posting schedule.",
  },
  {
    href: "/toolkit/link-in-bio",
    title: "Link-in-bio guide",
    description: "Step-by-step so followers land on your new booth, shop, or signup.",
  },
  {
    href: "/toolkit/landing-page",
    title: "Simple landing page",
    description: "Lightweight one-page setup (e.g. Carrd) to point ads and QR codes at.",
  },
] as const;

export function ToolkitHubCards() {
  const [origin, setOrigin] = useState("");
  const [copiedHref, setCopiedHref] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (!copiedHref) return;
    const t = window.setTimeout(() => setCopiedHref(null), 2000);
    return () => window.clearTimeout(t);
  }, [copiedHref]);

  const copyLink = useCallback(async (href: string) => {
    const url = origin ? `${origin}${href}` : href;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedHref(href);
    } catch {
      setCopiedHref(null);
    }
  }, [origin]);

  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {TOOLS.map((tool) => (
        <Card key={tool.href} className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base leading-snug">{tool.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pt-0">
            <p className="flex-1 text-sm leading-relaxed text-black/70">{tool.description}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={tool.href}
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                Open tool
              </Link>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void copyLink(tool.href)}
                disabled={!origin}
              >
                {copiedHref === tool.href ? "Copied" : "Copy link"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
