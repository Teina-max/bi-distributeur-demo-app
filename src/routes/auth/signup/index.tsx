import { SiteConfig } from "@/site-config";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";

// POC perimeter — public signup is disabled. Access is gated by the
// allowlist in convex/auth/allowlist.ts; the signin page (email + OTP)
// is the only sanctioned entry point. See also user.create.after hook.
export const Route = createFileRoute("/auth/signup/")({
  validateSearch: z.object({
    callbackUrl: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: `Sign Up | ${SiteConfig.title}` },
      {
        name: "description",
        content: "Signup is disabled — sign in with an authorized email.",
      },
    ],
  }),
  component: () => <Navigate to="/auth/signin" replace />,
});
