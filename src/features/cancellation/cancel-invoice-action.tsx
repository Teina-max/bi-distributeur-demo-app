import { useRouter } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useCancelConfirm } from "./use-cancel-confirm";

type Props = {
  sourceId: Id<"invoices">;
  sourceNumber: string;
  status: string;
};

export function CancelInvoiceAction({ sourceId, sourceNumber, status }: Props) {
  const router = useRouter();
  const cancelInvoice = useMutation(api.invoices.mutations.cancel);
  const openConfirm = useCancelConfirm({
    title: `Annuler la facture ${sourceNumber} ?`,
    description:
      "La facture passera en statut annulé et les BL liés reviendront en livré.",
    actionLabel: "Annuler définitivement",
    onConfirm: async (reason) => {
      await cancelInvoice({ id: sourceId, reason });
      toast.success("Facture annulée, BL restaurés");
      void router.invalidate();
    },
  });

  if (status !== "draft" && status !== "sent") return null;

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={openConfirm}
      data-testid="cancel-invoice-action"
    >
      <Ban data-icon="inline-start" />
      Annuler la facture
    </Button>
  );
}
