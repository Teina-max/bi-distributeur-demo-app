import { useRouter } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useCancelConfirm } from "./use-cancel-confirm";

type Props = {
  sourceId: Id<"delivery_forms">;
  sourceNumber: string;
  status: string;
};

const CANCELLABLE_STATUSES = new Set([
  "in_preparation",
  "ready_to_ship",
  "shipped",
  "delivered",
]);

export function CancelDeliveryFormAction({
  sourceId,
  sourceNumber,
  status,
}: Props) {
  const router = useRouter();
  const cancelDeliveryForm = useMutation(api.delivery_forms.mutations.cancel);
  const stockWasOut = status === "shipped" || status === "delivered";
  const openConfirm = useCancelConfirm({
    title: `Annuler le BL ${sourceNumber} ?`,
    description: stockWasOut
      ? "Le BL passera en statut annulé et le stock sera restauré pour chaque ligne."
      : "Le BL passera en statut annulé. Aucun mouvement de stock n'est nécessaire.",
    actionLabel: "Annuler définitivement",
    onConfirm: async (reason) => {
      await cancelDeliveryForm({ id: sourceId, reason });
      toast.success(stockWasOut ? "BL annulé, stock restauré" : "BL annulé");
      void router.invalidate();
    },
  });

  if (!CANCELLABLE_STATUSES.has(status)) return null;

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={openConfirm}
      data-testid="cancel-delivery-form-action"
    >
      <Ban data-icon="inline-start" />
      Annuler ce BL
    </Button>
  );
}
