#!/usr/bin/env node
/**
 * Seed BI Distributeur Premium POC user_preferences for Toscana Beverages SARL (4 users).
 * Magic-link auth means Better Auth accounts are created on first sign-in,
 * not here. This script only pre-seeds user_preferences for known emails.
 *
 * Usage:
 *   pnpm convex:dev   # ensure dev deployment is reachable
 *   pnpm seed:poc-users
 *
 * Requires env: CONVEX_URL or VITE_CONVEX_URL pointing at the active dev deployment.
 */
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function resolveConvexUrl() {
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  if (process.env.VITE_CONVEX_URL) return process.env.VITE_CONVEX_URL;
  try {
    const env = readFileSync(resolve(repoRoot, ".env.local"), "utf8");
    const match = env.match(/^VITE_CONVEX_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // ignore — no .env.local
  }
  return null;
}

const convexUrl = resolveConvexUrl();
if (!convexUrl) {
  console.error(
    "Missing CONVEX_URL or VITE_CONVEX_URL env (and no .env.local). Run pnpm convex:dev first.",
  );
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);

try {
  const result = await client.mutation("seeds/users:ensureUsersPublic", {});
  console.log(`user_preferences seeded: ${JSON.stringify(result)}`);
} catch (err) {
  console.error("Failed to seed user_preferences:", err?.message ?? err);
  process.exit(1);
}
