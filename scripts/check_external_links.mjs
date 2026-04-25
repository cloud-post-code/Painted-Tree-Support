#!/usr/bin/env node
/**
 * Smoke-check a few public URLs return 200 (run with API + web up, or point BASE_URLs).
 * Usage: API_BASE=http://localhost:8000 node scripts/check_external_links.mjs
 */
const API = process.env.API_BASE || "http://localhost:8000";
const paths = [
  "/api/v1/health",
  "/api/v1/resources?category=grant&limit=1",
  "/api/v1/guides",
  "/api/v1/vendors",
];

async function main() {
  let failed = false;
  for (const p of paths) {
    const url = `${API}${p}`;
    const r = await fetch(url);
    if (!r.ok) {
      console.error("FAIL", url, r.status);
      failed = true;
    } else {
      console.log("OK", url);
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
