import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { TicketListSkeleton } from "./_components/ticket-list-skeleton";

export const Route = createFileRoute("/app/tickets")({
  component: TicketsRoute,
  pendingComponent: TicketListSkeleton,
});

function TicketsRoute() {
  const router = useRouter();
  useKeyboardScope("tickets-route", {
    F5: () => {
      void router.invalidate();
    },
  });

  return <Outlet />;
}
