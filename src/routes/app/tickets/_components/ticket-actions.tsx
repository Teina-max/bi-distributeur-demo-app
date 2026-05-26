import * as React from "react";
import { useRouter } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { CheckCircle2, LockOpen, RotateCcw, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { TicketDetailDto } from "@convex/support_tickets/dto/ticketDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { TICKET_STATUS_LABEL } from "./ticket-status-badge";

type Props = {
  ticket: TicketDetailDto;
  isAdmin: boolean;
};

const NEXT_STATUSES: TicketDetailDto["status"][] = [
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
];

export function TicketActions({ ticket, isAdmin }: Props) {
  const router = useRouter();
  const updateStatus = useMutation(api.support_tickets.mutations.updateStatus);
  const assign = useMutation(api.support_tickets.mutations.assign);
  const close = useMutation(api.support_tickets.mutations.close);
  const reopen = useMutation(api.support_tickets.mutations.reopen);

  const [assigning, setAssigning] = React.useState(false);

  const isClosed = ticket.status === "closed";

  const handleStatus = async (next: TicketDetailDto["status"]) => {
    if (next === ticket.status) return;
    try {
      await updateStatus({
        id: ticket.id as Id<"support_tickets">,
        status: next,
      });
      toast.success(`Statut : ${TICKET_STATUS_LABEL[next]}`);
      void router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Changement de statut impossible.",
      );
    }
  };

  const handleAssign = () => {
    dialogManager.input({
      title: `Assigner le ticket ${ticket.number}`,
      description: "Email du responsable (laisser vide pour désassigner).",
      icon: UserPlus,
      input: {
        label: "Email",
        defaultValue: ticket.assignedTo ?? "",
        placeholder: "marco@toscana.local",
      },
      action: {
        label: "Assigner",
        onClick: async (value) => {
          setAssigning(true);
          try {
            const normalized = (value ?? "").trim();
            await assign({
              id: ticket.id as Id<"support_tickets">,
              assigned_to: normalized.length === 0 ? null : normalized,
            });
            toast.success(
              normalized.length === 0
                ? "Désassigné."
                : `Assigné à ${normalized}.`,
            );
            void router.invalidate();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Assignation impossible.",
            );
          } finally {
            setAssigning(false);
          }
        },
      },
    });
  };

  const handleClose = () => {
    dialogManager.confirm({
      title: `Clôturer le ticket ${ticket.number} ?`,
      description:
        "Le ticket passera en statut Clôturé. Plus aucun message ne pourra être ajouté tant qu'il n'est pas réouvert.",
      variant: "destructive",
      icon: X,
      action: {
        label: "Clôturer définitivement",
        variant: "destructive",
        onClick: async () => {
          await close({ id: ticket.id as Id<"support_tickets"> });
          toast.success("Ticket clôturé.");
          void router.invalidate();
        },
      },
    });
  };

  const handleReopen = () => {
    dialogManager.confirm({
      title: `Réouvrir le ticket ${ticket.number} ?`,
      description: "Un message système sera ajouté pour tracer la réouverture.",
      variant: "warning",
      icon: RotateCcw,
      action: {
        label: "Réouvrir",
        onClick: async () => {
          await reopen({ id: ticket.id as Id<"support_tickets"> });
          toast.success("Ticket réouvert.");
          void router.invalidate();
        },
      },
    });
  };

  return (
    <div className="flex flex-col gap-3" data-testid="ticket-actions">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">Statut :</span>
        {NEXT_STATUSES.map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={status === ticket.status ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            disabled={isClosed}
            onClick={() => void handleStatus(status)}
            data-testid={`ticket-action-status-${status}`}
          >
            {TICKET_STATUS_LABEL[status]}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isAdmin ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={handleAssign}
              disabled={isClosed || assigning}
              data-testid="ticket-action-assign"
            >
              <UserPlus className="size-3.5" />
              Assigner
            </Button>
            {!isClosed ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-xs"
                onClick={handleClose}
                data-testid="ticket-action-close"
              >
                <CheckCircle2 className="size-3.5" />
                Clôturer
              </Button>
            ) : null}
          </>
        ) : null}
        {isClosed ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs"
            onClick={handleReopen}
            data-testid="ticket-action-reopen"
          >
            <LockOpen className="size-3.5" />
            Réouvrir
          </Button>
        ) : null}
      </div>

      {!isAdmin ? (
        <Input
          type="hidden"
          value=""
          readOnly
          data-testid="ticket-actions-non-admin"
        />
      ) : null}
    </div>
  );
}
