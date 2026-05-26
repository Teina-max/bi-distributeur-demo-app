import * as React from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { computeVatBreakdown } from "@convex/utils/vatBreakdown";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { usePurchaseOrderLines } from "@/features/supply/use-purchase-order-lines";
import type {
  SupplierSuggestion,
  SupplyLineItemPayload,
} from "@/features/supply/types";
import { TotalsPanel } from "@/routes/app/quotations/_components/totals-panel";
import { PurchaseOrderLinesTable } from "./purchase-order-lines-table";
import { SupplierAutocomplete } from "./supplier-autocomplete";

type SelectedSupplier = {
  id: Id<"suppliers">;
  code: string;
  name: string;
};

type Props = {
  initialPurchaseOrderId?: Id<"purchase_orders">;
  initialNumber?: string;
  initialSupplier?: SelectedSupplier | null;
  initialLines?: readonly SupplyLineItemPayload[];
};

type HintAction = {
  keyName: string;
  label: string;
  onClick?: () => void;
};

const askVatRate = (current: number): number | null => {
  const raw = window.prompt(
    `Taux TVA pour cette ligne (5.5, 10, 20) — actuel: ${current}`,
    String(current),
  );
  if (raw === null) return null;
  const parsed = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const triggerKey = (key: string) =>
  window.dispatchEvent(new KeyboardEvent("keydown", { key }));

export function PurchaseOrderForm({
  initialPurchaseOrderId,
  initialNumber,
  initialSupplier = null,
  initialLines = [],
}: Props) {
  const navigate = useNavigate();
  const create = useMutation(api.purchase_orders.mutations.create);
  const update = useMutation(api.purchase_orders.mutations.updateDraft);

  const [supplier, setSupplier] = React.useState<SelectedSupplier | null>(
    initialSupplier,
  );
  const [saving, setSaving] = React.useState(false);
  const firstCodeInputRef = React.useRef<HTMLInputElement>(null);

  const {
    lines,
    filled,
    payload,
    setProduct,
    setQuantity,
    setPurchasePrice,
    setVatOverride,
    removeLine,
  } = usePurchaseOrderLines(initialLines);

  const breakdown = React.useMemo(
    () =>
      computeVatBreakdown(
        filled.map((line) => ({
          quantity: line.quantity_ordered,
          unit_price_ht: line.unit_purchase_price_ht,
          vat_rate: line.vat_rate,
        })),
      ),
    [filled],
  );

  const hasDraft = filled.length > 0 && supplier !== null;

  const handlePickSupplier = (suggestion: SupplierSuggestion) => {
    setSupplier({
      id: suggestion.id,
      code: suggestion.code,
      name: suggestion.name,
    });
    queueMicrotask(() => {
      firstCodeInputRef.current?.focus();
    });
  };

  const handleVatOverride = (idx: number) => {
    const target = lines[idx];
    if (target.kind !== "filled") return;
    const next = askVatRate(target.vat_rate);
    if (next === null) return;
    setVatOverride(idx, next);
  };

  const handleSave = React.useCallback(async () => {
    if (!supplier || !hasDraft) {
      toast.error("BC incomplet : fournisseur + au moins une ligne requis.");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      if (initialPurchaseOrderId) {
        await update({
          id: initialPurchaseOrderId,
          supplier_id: supplier.id,
          lines: payload,
        });
        toast.success(`BC ${initialNumber ?? ""} mis à jour.`);
      } else {
        const id = await create({
          supplier_id: supplier.id,
          lines: payload,
        });
        toast.success("BC enregistré.");
        await navigate({
          to: "/app/purchase-orders/$purchaseOrderId",
          params: { purchaseOrderId: id },
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Sauvegarde impossible.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    create,
    hasDraft,
    initialNumber,
    initialPurchaseOrderId,
    navigate,
    payload,
    saving,
    supplier,
    update,
  ]);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && (event.key === "s" || event.key === "S")) {
        event.preventDefault();
        void handleSave();
      } else if (event.key === "Escape" && hasDraft && !saving) {
        event.preventDefault();
        dialogManager.confirm({
          title: "Quitter sans enregistrer ?",
          description:
            "Le brouillon en cours sera perdu (sauf si déjà sauvegardé).",
          variant: "warning",
          action: {
            label: "Quitter",
            onClick: async () => {
              await navigate({ to: "/app/purchase-orders" });
            },
          },
          cancel: { label: "Continuer la saisie" },
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, hasDraft, navigate, saving]);

  const hints: HintAction[] = [
    {
      keyName: "Ctrl+S",
      label: "Enregistrer",
      onClick: () => void handleSave(),
    },
    {
      keyName: "Echap",
      label: "Quitter",
      onClick: () => triggerKey("Escape"),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold">
            {initialNumber ? `BC ${initialNumber}` : "Nouveau BC fournisseur"}
          </h1>
          <span className="text-muted-foreground font-mono text-xs">
            {saving ? "Enregistrement…" : "Brouillon"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {hints.map((hint) => (
            <Button
              key={hint.keyName}
              variant="ghost"
              size="sm"
              onClick={hint.onClick}
              disabled={!hint.onClick}
              className="h-7 px-2 text-xs"
            >
              <span>{hint.label}</span>
              <kbd className="bg-muted text-muted-foreground ml-1.5 inline-flex h-4 items-center rounded border px-1 font-mono text-[10px]">
                {hint.keyName}
              </kbd>
            </Button>
          ))}
        </div>
      </div>
      <SupplierAutocomplete
        selected={supplier}
        onPickSupplier={handlePickSupplier}
      />
      <PurchaseOrderLinesTable
        lines={lines}
        onPickProduct={(idx, product) =>
          setProduct(idx, product, {
            quantity_ordered: 1,
            unit_purchase_price_ht: 0,
          })
        }
        onQuantityChange={setQuantity}
        onPurchasePriceChange={setPurchasePrice}
        onRemove={removeLine}
        onVatOverride={handleVatOverride}
        firstCodeInputRef={firstCodeInputRef}
      />
      <TotalsPanel breakdown={breakdown} />
    </div>
  );
}
