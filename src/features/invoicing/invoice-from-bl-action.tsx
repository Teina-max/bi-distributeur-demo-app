import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";

type Props = {
  deliveryFormId: Id<"delivery_forms">;
  deliveryFormNumber: string;
};

export function InvoiceFromBlAction({
  deliveryFormId,
  deliveryFormNumber,
}: Props) {
  const navigate = useNavigate();
  const convert = useMutation(api.invoices.mutations.convertFromDeliveryForms);

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    dialogManager.confirm({
      title: `Convertir le BL ${deliveryFormNumber} en facture ?`,
      description:
        "Une facture brouillon sera créée, échéance = +30j (payment_terms client).",
      icon: Receipt,
      action: {
        label: "Continuer",
        onClick: async () => {
          try {
            const result = await convert({
              delivery_form_ids: [deliveryFormId],
            });
            toast.success(`Facture ${result.number} créée`);
            void navigate({
              to: "/app/invoices/$invoiceId",
              params: { invoiceId: result.id },
            });
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Erreur conversion facture",
            );
            throw err;
          }
        },
      },
      cancel: { label: "Annuler" },
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      title="Facturer ce BL (F9)"
      aria-label={`Facturer ${deliveryFormNumber}`}
      data-testid={`bl-row-action-invoice-${deliveryFormNumber}`}
      className="text-muted-foreground hover:text-primary h-6 w-6 p-0"
    >
      <Receipt className="size-3.5" />
    </Button>
  );
}
