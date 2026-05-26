import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { InsightsDashboardSkeleton } from "./_components/insights-skeleton";

export const Route = createFileRoute("/app/insights")({
  component: InsightsRoute,
  pendingComponent: InsightsDashboardSkeleton,
});

function InsightsRoute() {
  const router = useRouter();
  useKeyboardScope("insights-route", {
    F5: () => {
      void router.invalidate();
    },
  });
  return <Outlet />;
}
