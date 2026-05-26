import * as React from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { computeVatBreakdown } from "@convex/utils/vatBreakdown";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { useQuotationLines } from "@/features/quotations/use-quotation-lines";
import type { ClientSuggestion } from "@/features/quotations/types";
import { TotalsPanel } from "@/routes/app/quotations/_components/totals-panel";
import { DeliveryFormNewClientAutocomplete } from "./delivery-form-new-client-autocomplete";
import { DeliveryFormNewLinesTable } from "./delivery-form-new-lines-table";

type SelectedClient = {
  id: Id<"clients">;
  code: string;
  name: string;
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

export function DeliveryFormNewForm() {
  const navigate = useNavigate();
  const createDirect = useMutation(api.delivery_forms.mutations.createDirect);

  const [client, setClient] = React.useState<SelectedClient | null>(null);
  const [saving, setSaving] = React.useState(false);
  const firstCodeInputRef = React.useRef<HTMLInputElement>(null);

  const {
    lines,
    filled,
    payload,
    setProduct,
    setQuantity,
    setVatOverride,
    removeLine,
  } = useQuotationLines([]);

  const breakdown = React.useMemo(() => computeVatBreakdown(filled), [filled]);

  const hasDraft = filled.length > 0 && client !== null;

  const handlePickClient = (suggestion: ClientSuggestion) => {
    setClient({
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
    if (!client) {
      toast.error("Client requis.");
      return;
    }
    if (filled.length === 0) {
      toast.error("Au moins une ligne requise.");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const mutationLines = payload.map((line) => ({
        product_id: line.product_id,
        quantity: line.quantity,
        vat_rate_override: line.vat_rate,
      }));
      const result = await createDirect({
        client_id: client.id,
        lines: mutationLines,
      });
      toast.success(`BL ${result.number} créé.`);
      await navigate({
        to: "/app/delivery-forms/$deliveryFormId",
        params: { deliveryFormId: result.id },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Création BL impossible.",
      );
    } finally {
      setSaving(false);
    }
  }, [client, createDirect, filled.length, navigate, payload, saving]);

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
              await navigate({ to: "/app/delivery-forms" });
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
      label: "Enregistrer BL",
      onClick: () => void handleSave(),
    },
    {
      keyName: "F9",
      label: "Facturer",
      onClick: () => triggerKey("F9"),
    },
    {
      keyName: "Echap",
      label: "Quitter",
      onClick: () => triggerKey("Escape"),
    },
  ];

  return (
    <div className="flex flex-col gap-4" data-testid="delivery-form-new">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold">Nouveau BL direct</h1>
          <span className="text-muted-foreground font-mono text-xs">
            {saving ? "Enregistrement…" : "Saisie"}
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
      <DeliveryFormNewClientAutocomplete
        selected={client}
        onPickClient={handlePickClient}
      />
      <DeliveryFormNewLinesTable
        lines={lines}
        onPickProduct={setProduct}
        onQuantityChange={setQuantity}
        onRemove={removeLine}
        onVatOverride={handleVatOverride}
        firstCodeInputRef={firstCodeInputRef}
      />
      <TotalsPanel breakdown={breakdown} />
    </div>
  );
}
