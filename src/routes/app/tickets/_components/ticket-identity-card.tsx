import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TicketDetailDto } from "@convex/support_tickets/dto/ticketDetail";
import { TICKET_CATEGORY_LABEL } from "./ticket-category-badge";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { TicketStatusBadge } from "./ticket-status-badge";

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketIdentityCard({ ticket }: { ticket: TicketDetailDto }) {
  return (
    <Card data-testid="ticket-identity-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="font-mono text-base">{ticket.number}</CardTitle>
        <div className="flex items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex justify-between gap-2 sm:col-span-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Titre</dt>
            <dd className="text-[13px]" data-testid="ticket-title">
              {ticket.title}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:col-span-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Description</dt>
            <dd
              className="text-[13px] whitespace-pre-wrap"
              data-testid="ticket-description"
            >
              {ticket.description}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Client</dt>
            <dd className="text-[13px]" data-testid="ticket-client">
              <Link
                to="/app/clients/$clientId"
                params={{ clientId: String(ticket.client.id) }}
                className="text-primary hover:underline"
              >
                <span className="font-mono">{ticket.client.code}</span> —{" "}
                {ticket.client.name}
              </Link>
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Catégorie</dt>
            <dd className="text-[13px]" data-testid="ticket-category">
              {TICKET_CATEGORY_LABEL[ticket.category]}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Créé le</dt>
            <dd className="font-mono text-[13px]" data-testid="ticket-created">
              {formatDateTime(ticket.createdAt)}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Créé par</dt>
            <dd className="font-mono text-[13px]" data-testid="ticket-creator">
              {ticket.createdBy}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Assigné à</dt>
            <dd className="font-mono text-[13px]" data-testid="ticket-assignee">
              {ticket.assignedTo ?? "—"}
            </dd>
          </div>
          {ticket.linkedDeliveryForm ? (
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <dt className="text-muted-foreground text-[13px]">BL lié</dt>
              <dd className="font-mono text-[13px]">
                <Link
                  to="/app/delivery-forms/$deliveryFormId"
                  params={{
                    deliveryFormId: String(ticket.linkedDeliveryForm.id),
                  }}
                  className="text-primary hover:underline"
                >
                  {ticket.linkedDeliveryForm.number}
                </Link>
              </dd>
            </div>
          ) : null}
          {ticket.linkedInvoice ? (
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <dt className="text-muted-foreground text-[13px]">
                Facture liée
              </dt>
              <dd className="font-mono text-[13px]">
                <Link
                  to="/app/invoices/$invoiceId"
                  params={{ invoiceId: String(ticket.linkedInvoice.id) }}
                  className="text-primary hover:underline"
                >
                  {ticket.linkedInvoice.number}
                </Link>
              </dd>
            </div>
          ) : null}
          {ticket.linkedProduct ? (
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <dt className="text-muted-foreground text-[13px]">Produit lié</dt>
              <dd className="font-mono text-[13px]">
                {ticket.linkedProduct.code} — {ticket.linkedProduct.name}
              </dd>
            </div>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}
