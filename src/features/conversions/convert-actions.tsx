import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { cn } from "@/lib/utils";
import {
  buildStockPreview,
  formatStockPreviewLine,
  type StockPreviewEntry,
  type StockPreviewLine,
} from "./stock-preview";

type ConvertToBlProps = {
  kind: "bl";
  sourceId: Id<"quotations">;
};

type ConvertToInvoiceProps = {
  kind: "invoice";
  sourceId: Id<"delivery_forms">;
  sourceNumber: string;
};

type Props = ConvertToBlProps | ConvertToInvoiceProps;

export function ConvertActions(props: Props) {
  if (props.kind === "bl") {
    return <ConvertToBl sourceId={props.sourceId} />;
  }
  return (
    <ConvertToInvoice
      sourceId={props.sourceId}
      sourceNumber={props.sourceNumber}
    />
  );
}

function StockPreviewBody({
  entries,
}: {
  entries: readonly StockPreviewEntry[];
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground font-mono text-[13px]">
        Aucune ligne à convertir.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1 font-mono text-[13px]">
      {entries.map((entry) => (
        <li
          key={entry.product_code}
          className={cn(entry.insufficient && "text-destructive")}
        >
          {formatStockPreviewLine(entry)}
          {entry.insufficient ? " — stock insuffisant" : null}
        </li>
      ))}
    </ul>
  );
}

function ConvertToBl({ sourceId }: { sourceId: Id<"quotations"> }) {
  const navigate = useNavigate();
  const preview = useQuery(api.delivery_forms.queries.getConversionPreview, {
    quotation_id: sourceId,
  });
  const convert = useMutation(
    api.delivery_forms.mutations.convertFromQuotation,
  );

  useKeyboardScope("convert-actions-bl", {
    F8: () => {
      if (!preview) {
        toast.error("Devis introuvable");
        return;
      }
      if (preview.status === "converted_to_delivery") {
        toast.error("Devis déjà converti");
        return;
      }
      const entries = buildStockPreview(
        preview.lines as readonly StockPreviewLine[],
      );
      dialogManager.custom({
        title: `Convertir le devis ${preview.quotation_number} en BL ?`,
        description:
          "Le stock sera décrémenté pour chaque ligne. Confirmer la conversion ?",
        size: "md",
        children: <StockPreviewBody entries={entries} />,
        action: {
          label: "Continuer (Entrée)",
          onClick: async () => {
            try {
              const result = await convert({ quotation_id: sourceId });
              toast.success(`BL ${result.number} créé`);
              void navigate({
                to: "/app/delivery-forms/$deliveryFormId",
                params: { deliveryFormId: result.id },
              });
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Erreur conversion BL",
              );
              throw err;
            }
          },
        },
        cancel: { label: "Annuler (Échap)" },
      });
    },
  });

  return null;
}

function ConvertToInvoice({
  sourceId,
  sourceNumber,
}: {
  sourceId: Id<"delivery_forms">;
  sourceNumber: string;
}) {
  const navigate = useNavigate();
  const convert = useMutation(api.invoices.mutations.convertFromDeliveryForms);

  useKeyboardScope("convert-actions-invoice", {
    F9: () => {
      dialogManager.confirm({
        title: `Convertir le BL ${sourceNumber} en facture ?`,
        description:
          "Une facture brouillon sera créée, échéance = +30j (payment_terms client).",
        action: {
          label: "Continuer (Entrée)",
          onClick: async () => {
            try {
              const result = await convert({ delivery_form_ids: [sourceId] });
              toast.success(`Facture ${result.number} créée`);
              void navigate({
                to: "/app/invoices/$invoiceId",
                params: { invoiceId: result.id },
              });
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : "Erreur conversion facture",
              );
              throw err;
            }
          },
        },
        cancel: { label: "Annuler (Échap)" },
      });
    },
  });

  return null;
}
