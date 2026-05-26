import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { ClientsListSkeleton } from "./_components/clients-skeleton";

export const Route = createFileRoute("/app/clients")({
  component: ClientsRoute,
  pendingComponent: ClientsListSkeleton,
});

function ClientsRoute() {
  const router = useRouter();
  useKeyboardScope("clients-route", {
    F5: () => {
      void router.invalidate();
    },
  });

  return <Outlet />;
}
