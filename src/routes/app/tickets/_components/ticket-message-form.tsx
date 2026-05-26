import * as React from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  ticketId: Id<"support_tickets">;
  disabled?: boolean;
  onPosted?: () => void;
};

export function TicketMessageForm({ ticketId, disabled, onPosted }: Props) {
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const addMessage = useMutation(api.support_tickets.mutations.addMessage);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      toast.error("Message vide.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await addMessage({ id: ticketId, body: trimmed });
      setBody("");
      toast.success("Message ajouté.");
      onPosted?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Ajout du message impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2"
      data-testid="ticket-message-form"
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          disabled
            ? "Réouvrir le ticket pour ajouter un message"
            : "Tapez votre message — retours-ligne préservés"
        }
        rows={4}
        disabled={disabled || submitting}
        className="font-mono text-[13px]"
        data-testid="ticket-message-input"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={disabled || submitting || body.trim().length === 0}
          data-testid="ticket-message-submit"
        >
          Envoyer
        </Button>
      </div>
    </form>
  );
}
