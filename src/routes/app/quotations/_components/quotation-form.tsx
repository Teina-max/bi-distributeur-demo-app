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
import type {
  ClientSuggestion,
  LineItemPayload,
} from "@/features/quotations/types";
import { ClientAutocomplete } from "./client-autocomplete";
import { QuotationLinesTable } from "./quotation-lines-table";
import { TotalsPanel } from "./totals-panel";

type SelectedClient = {
  id: Id<"clients">;
  code: string;
  name: string;
};

type QuotationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "converted_to_delivery"
  | "cancelled";

type Props = {
  initialQuotationId?: Id<"quotations">;
  initialNumber?: string;
  initialClient?: SelectedClient | null;
  initialLines?: readonly LineItemPayload[];
  initialStatus?: QuotationStatus;
};

const STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  converted_to_delivery: "Converti en BL",
  cancelled: "Annulé",
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

export function QuotationForm({
  initialQuotationId,
  initialNumber,
  initialClient = null,
  initialLines = [],
  initialStatus = "draft",
}: Props) {
  const isEditable = initialStatus === "draft";
  const navigate = useNavigate();
  const create = useMutation(api.quotations.mutations.create);
  const update = useMutation(api.quotations.mutations.updateDraft);

  const [client, setClient] = React.useState<SelectedClient | null>(
    initialClient,
  );
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
  } = useQuotationLines(initialLines);

  const breakdown = React.useMemo(() => computeVatBreakdown(filled), [filled]);

  const hasDraft = filled.length > 0 && client !== null;

  const handlePickClient = (suggestion: ClientSuggestion) => {
    setClient({
      id: suggestion.id,
      code: suggestion.code,
      name: suggestion.name,
    });
    // Defer focus until next paint so the line table is mounted with refs.
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
    if (!isEditable) {
      toast.error(
        `Devis non modifiable (statut ${STATUS_LABEL[initialStatus]}).`,
      );
      return;
    }
    if (!client || !hasDraft) {
      toast.error("Devis incomplet : client + au moins une ligne requis.");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      if (initialQuotationId) {
        await update({
          id: initialQuotationId,
          client_id: client.id,
          lines: payload,
        });
        toast.success(`Brouillon ${initialNumber ?? ""} mis à jour.`);
      } else {
        const id = await create({
          client_id: client.id,
          lines: payload,
        });
        toast.success("Brouillon enregistré.");
        await navigate({
          to: "/app/quotations/$quotationId",
          params: { quotationId: id },
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
    client,
    create,
    hasDraft,
    initialNumber,
    initialQuotationId,
    initialStatus,
    isEditable,
    navigate,
    payload,
    saving,
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
              await navigate({ to: "/app" });
            },
          },
          cancel: { label: "Continuer la saisie" },
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, hasDraft, navigate, saving]);

  const hints: HintAction[] = isEditable
    ? [
        {
          keyName: "Ctrl+S",
          label: "Enregistrer",
          onClick: () => void handleSave(),
        },
        {
          keyName: "F8",
          label: "Valider+BL",
          onClick: () => triggerKey("F8"),
        },
        {
          keyName: "Echap",
          label: "Quitter",
          onClick: () => triggerKey("Escape"),
        },
      ]
    : [
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
            {initialNumber ? `Devis ${initialNumber}` : "Nouveau devis"}
          </h1>
          <span
            className={
              isEditable
                ? "text-muted-foreground font-mono text-xs"
                : "text-destructive font-mono text-xs font-semibold"
            }
            data-testid="quotation-form-status"
          >
            {saving ? "Enregistrement…" : STATUS_LABEL[initialStatus]}
            {!isEditable ? " · lecture seule" : ""}
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
      <ClientAutocomplete selected={client} onPickClient={handlePickClient} />
      <QuotationLinesTable
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
