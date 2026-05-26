import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/nowts/typography";
import type { TicketMessageDto } from "@convex/support_tickets/dto/ticketMessage";

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketMessagesTimeline({
  messages,
}: {
  messages: readonly TicketMessageDto[];
}) {
  return (
    <Card data-testid="ticket-messages-timeline">
      <CardHeader>
        <CardTitle className="text-base">Messages</CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <Typography variant="muted">Aucun message pour le moment.</Typography>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((message) => (
              <li
                key={String(message.id)}
                className="border-border rounded-md border px-3 py-2"
                data-testid={`ticket-message-${String(message.id)}`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono">{message.authorEmail}</span>
                  <span className="text-muted-foreground font-mono tabular-nums">
                    {formatDateTime(message.createdAt)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[13px] whitespace-pre-wrap">
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
