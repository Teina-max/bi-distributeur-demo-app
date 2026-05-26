import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/nowts/typography";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { authClient } from "@/lib/auth-client";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { TicketActions } from "../_components/ticket-actions";
import { TicketDetailSkeleton } from "../_components/ticket-list-skeleton";
import { TicketIdentityCard } from "../_components/ticket-identity-card";
import { TicketMessageForm } from "../_components/ticket-message-form";
import { TicketMessagesTimeline } from "../_components/ticket-messages-timeline";

export const Route = createFileRoute("/app/tickets/$ticketId/")({
  component: TicketDetailRoute,
  pendingComponent: TicketDetailSkeleton,
});

function TicketDetailRoute() {
  const { ticketId } = Route.useParams();
  const id = ticketId as unknown as Id<"support_tickets">;
  const navigate = useNavigate();
  const router = useRouter();

  const ticket = useQuery(api.support_tickets.queries.getById, { id });
  const messages = useQuery(api.support_tickets.queries.listMessages, {
    ticket_id: id,
  });
  const session = authClient.useSession();

  useKeyboardScope("ticket-detail", {
    Escape: () => {
      void navigate({ to: "/app/tickets" });
    },
    F5: () => {
      void router.invalidate();
    },
  });

  if (ticket === undefined || messages === undefined) {
    return <TicketDetailSkeleton />;
  }

  if (ticket === null) {
    return (
      <Layout size="xl">
        <LayoutContent>
          <Typography variant="muted">Ticket introuvable.</Typography>
        </LayoutContent>
      </Layout>
    );
  }

  const sessionUser = session.data?.user as
    | (typeof session.data extends infer T
        ? T extends { user: infer U }
          ? U
          : never
        : never)
    | undefined;
  const sessionRole =
    sessionUser && "role" in (sessionUser as Record<string, unknown>)
      ? String((sessionUser as Record<string, unknown>).role ?? "")
      : "";
  const isAdmin = sessionRole === "admin" || sessionRole === "owner";

  const isClosed = ticket.status === "closed";

  return (
    <Layout size="xl">
      <LayoutHeader>
        <LayoutTitle>Ticket {ticket.number}</LayoutTitle>
        <Typography variant="muted">Echap retour · F5 rafraîchir</Typography>
      </LayoutHeader>
      <LayoutContent>
        <div className="flex flex-col gap-4">
          <TicketIdentityCard ticket={ticket} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketActions ticket={ticket} isAdmin={isAdmin} />
            </CardContent>
          </Card>
          <TicketMessagesTimeline messages={messages} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ajouter un message</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketMessageForm
                ticketId={id}
                disabled={isClosed}
                onPosted={() => void router.invalidate()}
              />
            </CardContent>
          </Card>
        </div>
      </LayoutContent>
    </Layout>
  );
}
