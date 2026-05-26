import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { Typography } from "@/components/nowts/typography";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { TicketForm } from "./_components/ticket-form";
import { TicketFormSkeleton } from "./_components/ticket-list-skeleton";

export const Route = createFileRoute("/app/tickets/new")({
  component: NewTicketPage,
  pendingComponent: TicketFormSkeleton,
});

function NewTicketPage() {
  const navigate = useNavigate();
  useKeyboardScope("tickets-new", {
    Escape: () => {
      void navigate({ to: "/app/tickets" });
    },
  });

  return (
    <Layout size="xl">
      <LayoutHeader>
        <LayoutTitle>Nouveau ticket SAV</LayoutTitle>
        <Typography variant="muted">
          Ctrl+S enregistre · Echap annule
        </Typography>
      </LayoutHeader>
      <LayoutContent>
        <TicketForm />
      </LayoutContent>
    </Layout>
  );
}
