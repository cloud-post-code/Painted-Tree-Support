"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Public Painted Tree vendor community group */
export const PAINTED_TREE_FB_GROUP = "https://www.facebook.com/groups/1482251463621586";

function pluginSrc(width: number, height: number) {
  const params = new URLSearchParams({
    href: PAINTED_TREE_FB_GROUP,
    tabs: "timeline",
    width: String(width),
    height: String(height),
    small_header: "false",
    adapt_container_width: "true",
    hide_cover: "false",
    show_facepile: "true",
  });
  return `https://www.facebook.com/plugins/page.php?${params.toString()}`;
}

/**
 * Meta caps official embed width (~500px). We scale the iframe visually so the
 * group preview uses as much of the viewport as possible while staying sharp enough to read.
 */
export function FacebookGroupEmbed() {
  const baseW = 500;
  const [size, setSize] = useState({ w: baseW, h: 2200, scale: 1 });

  useEffect(() => {
    function measure() {
      const pad = 48;
      const vw = window.innerWidth - pad;
      const scale = Math.min(2.75, Math.max(1, vw / baseW));
      const h = Math.min(3600, Math.max(1800, Math.round(window.innerHeight * 3.2)));
      setSize({ w: baseW, h, scale });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const outerH = Math.ceil(size.h * size.scale);

  return (
    <section
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-x-auto border-y border-black/10 py-12"
      style={{
        background:
          "linear-gradient(180deg, rgba(24, 119, 242, 0.09) 0%, rgba(240, 241, 242, 0.95) 28%, var(--background) 100%)",
      }}
    >
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--vrr-ink)] sm:text-3xl">
          Painted Tree community on Facebook
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-black/75 sm:text-lg">
          This is the main Facebook group for the movement — about{" "}
          <strong className="font-semibold text-[var(--vrr-ink)]">3.7K painted tree people</strong>{" "}
          sharing <strong className="font-semibold text-[var(--vrr-ink)]">community voices</strong>, peer
          advice, <strong className="font-semibold text-[var(--vrr-ink)]">resources</strong>, and practical{" "}
          <strong className="font-semibold text-[var(--vrr-ink)]">information</strong> as everyone navigates
          markets, inventory, and comebacks together.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={PAINTED_TREE_FB_GROUP}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg bg-[#1877F2] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#166FE5]"
            data-event="facebook_group_join"
          >
            Open group on Facebook
          </Link>
          <span className="text-sm text-black/55">Public group · join or browse on Facebook</span>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-2xl px-4 text-center text-xs text-black/50">
        Embedded preview below uses Meta&apos;s page widget (max ~500px wide). It is scaled up on larger
        screens so you get the largest practical view; if it does not render, the button above always opens
        the full group.
      </p>

      <div
        className="mx-auto mt-6 flex w-full justify-center px-2 sm:px-4"
        style={{ minHeight: outerH }}
      >
        <div
          style={{
            width: size.w,
            height: size.h,
            transform: `scale(${size.scale})`,
            transformOrigin: "top center",
          }}
        >
          <iframe
            title="Painted Tree Facebook group (Meta embed)"
            src={pluginSrc(size.w, size.h)}
            width={size.w}
            height={size.h}
            style={{ border: "none", maxWidth: "none" }}
            className="rounded-lg bg-white shadow-lg ring-1 ring-black/10"
            allow="encrypted-media; clipboard-write"
          />
        </div>
      </div>
    </section>
  );
}
