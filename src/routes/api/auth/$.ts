import { handler } from "@/lib/auth-server";
import { createFileRoute } from "@tanstack/react-router";

// Vite dev pipeline (TanStack Start → srvx) drops every Set-Cookie except the
// last when a response carries several. Better Auth callbacks (magic-link, OTP,
// OAuth) set `<prefix>.session_token`, `<prefix>.convex_jwt`, and
// `<prefix>.login_method` in the same response, so only one survives →
// `<prefix>.session_token` lost → useConvexAuth() never validates → bounce
// loop /auth/signin ↔ /orgs. Reorder so session_token is last; convex_jwt and
// login_method are re-emitted by subsequent get-session / convex-token
// round-trips. Pattern from ~/jean-claude/memories/learnings/
// 2026-05-vite-srvx-multi-setcookie.md (validated on Digitalliance Sprint UI #2,
// commit 6473b70). Drop once srvx / TanStack Start propagate multiple
// Set-Cookie headers natively.
const SESSION_COOKIE_HINT = ".session_token=";

const preserveSetCookieHeaders = async (request: Request) => {
  const response = await handler(request);
  const setCookieHeaders = response.headers.getSetCookie();
  if (setCookieHeaders.length <= 1) return response;

  const sessionCookie = setCookieHeaders.find((c) =>
    c.includes(SESSION_COOKIE_HINT),
  );
  const others = setCookieHeaders.filter((c) => c !== sessionCookie);
  const ordered = sessionCookie ? [...others, sessionCookie] : setCookieHeaders;

  const newHeaders = new Headers();
  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") continue;
    newHeaders.set(key, value);
  }
  for (const cookie of ordered) newHeaders.append("set-cookie", cookie);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => preserveSetCookieHeaders(request),
      POST: async ({ request }) => preserveSetCookieHeaders(request),
    },
  },
});
