import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { QuotationsListSkeleton } from "./_components/quotations-skeleton";

export const Route = createFileRoute("/app/quotations")({
  component: QuotationsLayout,
  pendingComponent: QuotationsListSkeleton,
});

function QuotationsLayout() {
  const navigate = useNavigate();
  const router = useRouter();

  useKeyboardScope("app-quotations", {
    F2: () => {
      void navigate({ to: "/app/quotations/new" });
    },
    F5: () => {
      void router.invalidate();
    },
  });

  return <Outlet />;
}
