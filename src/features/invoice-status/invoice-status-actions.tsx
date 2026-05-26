import { useRouter } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { CheckCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { InvoiceDetailDto } from "@convex/invoices/dto/invoiceDetail";
import { Button } from "@/components/ui/button";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";

type Props = {
  invoice: InvoiceDetailDto;
};

type Transition = "sent" | "paid";

const TRANSITION_CONFIRMS: Record<
  Transition,
  {
    title: (number: string) => string;
    description: string;
    successToast: string;
  }
> = {
  sent: {
    title: (n) => `Marquer la facture ${n} comme envoyée ?`,
    description:
      "Le statut passera à « Envoyée » et la date d'envoi sera horodatée.",
    successToast: "Facture marquée comme envoyée",
  },
  paid: {
    title: (n) => `Marquer la facture ${n} comme payée ?`,
    description: "Le statut passera à « Payée » et deviendra définitif.",
    successToast: "Facture marquée comme payée",
  },
};

export function InvoiceStatusActions({ invoice }: Props) {
  const router = useRouter();
  const updateStatus = useMutation(api.invoices.mutations.updateStatus);

  const canMarkSent = invoice.status === "draft";
  const canMarkPaid =
    invoice.status === "draft" ||
    invoice.status === "sent" ||
    invoice.status === "overdue";

  const transition = (newStatus: Transition) => {
    const cfg = TRANSITION_CONFIRMS[newStatus];
    dialogManager.confirm({
      title: cfg.title(invoice.number),
      description: cfg.description,
      action: {
        label: "Confirmer (Entrée)",
        onClick: async () => {
          try {
            await updateStatus({ id: invoice.id, newStatus });
            toast.success(cfg.successToast);
            void router.invalidate();
          } catch (err) {
            toast.error(
              err instanceof Error
                ? err.message
                : "Erreur changement de statut",
            );
            throw err;
          }
        },
      },
      cancel: { label: "Annuler (Échap)" },
    });
  };

  useKeyboardScope("invoice-detail-status", {
    F6: () => {
      if (canMarkSent) transition("sent");
    },
    F7: () => {
      if (canMarkPaid) transition("paid");
    },
  });

  if (!canMarkSent && !canMarkPaid) return null;

  return (
    <>
      {canMarkSent ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => transition("sent")}
          className="h-7 px-2 text-xs"
          data-testid="invoice-detail-action-mark-sent"
        >
          <Send data-icon="inline-start" />
          <span>Marquer envoyée</span>
          <kbd className="bg-muted text-muted-foreground ml-1.5 inline-flex h-4 items-center rounded border px-1 font-mono text-[10px]">
            F6
          </kbd>
        </Button>
      ) : null}
      {canMarkPaid ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => transition("paid")}
          className="h-7 px-2 text-xs"
          data-testid="invoice-detail-action-mark-paid"
        >
          <CheckCheck data-icon="inline-start" />
          <span>Marquer payée</span>
          <kbd className="bg-muted text-muted-foreground ml-1.5 inline-flex h-4 items-center rounded border px-1 font-mono text-[10px]">
            F7
          </kbd>
        </Button>
      ) : null}
    </>
  );
}
