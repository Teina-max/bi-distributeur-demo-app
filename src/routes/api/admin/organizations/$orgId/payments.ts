import { getRequiredAdmin } from "@/lib/auth/auth-user";
import { handleApiError } from "@/lib/api-middleware";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/organizations/$orgId/payments")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await getRequiredAdmin();
          return Response.json({ payments: [] });
        } catch (e) {
          return handleApiError(e);
        }
      },
    },
  },
});
