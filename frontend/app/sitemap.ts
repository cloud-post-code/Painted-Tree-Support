import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const paths = [
    "",
    "/immediate-help",
    "/sell-now",
    "/sell-now/listings",
    "/community",
    "/vendors",
    "/vendors/submit",
    "/legal",
    "/legal/directory",
    "/toolkit",
    "/toolkit/social",
    "/toolkit/email",
    "/toolkit/we-moved",
    "/toolkit/link-in-bio",
    "/help",
    "/help/space",
    "/help/services",
    "/help/volunteer",
    "/help/donate",
    "/help/supporters",
    "/roadmap",
  ];
  return paths.map((p) => ({ url: `${base}${p}`, lastModified: new Date() }));
}
