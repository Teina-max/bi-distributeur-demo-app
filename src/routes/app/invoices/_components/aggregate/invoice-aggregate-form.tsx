import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/nowts/typography";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { ClientPicker, type PickedClient } from "./client-picker";
import { InvoiceableBLsTable } from "./invoiceable-bls-table";
import { SelectedSummaryFooter } from "./selected-summary-footer";

export function InvoiceAggregateForm() {
  const navigate = useNavigate();
  const convert = useMutation(api.invoices.mutations.convertFromDeliveryForms);

  const [client, setClient] = React.useState<PickedClient | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [seededClientId, setSeededClientId] = React.useState<string | null>(
    null,
  );
  const [saving, setSaving] = React.useState(false);

  const rows = useQuery(
    api.delivery_forms.queries.listInvoiceableByClient,
    client ? { client_id: client.id } : "skip",
  );

  const loading = client !== null && rows === undefined;
  const safeRows = React.useMemo(() => rows ?? [], [rows]);

  // Sync sélection avec le client choisi : reset si aucun client, seed all
  // dès que les rows arrivent pour un nouveau client. Évite useEffect.
  const nextSeededId = client === null ? null : client.id;
  if (seededClientId !== nextSeededId) {
    if (nextSeededId === null) {
      setSeededClientId(null);
      setSelectedIds(new Set());
    } else if (rows !== undefined) {
      setSeededClientId(nextSeededId);
      setSelectedIds(new Set(rows.map((r) => r.id as string)));
    }
  }

  const toggleOne = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = React.useCallback(() => {
    setSelectedIds((prev) => {
      if (safeRows.length === 0) return prev;
      const allSelected = safeRows.every((r) => prev.has(r.id as string));
      if (allSelected) return new Set();
      return new Set(safeRows.map((r) => r.id as string));
    });
  }, [safeRows]);

  const selectedCount = selectedIds.size;
  const canSubmit = selectedCount > 0 && !saving;

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit) return;
    const ids = safeRows
      .filter((r) => selectedIds.has(r.id as string))
      .map((r) => r.id as Id<"delivery_forms">);
    if (ids.length === 0) {
      toast.error("Sélectionnez au moins 1 BL.");
      return;
    }
    setSaving(true);
    try {
      const result = await convert({ delivery_form_ids: ids });
      toast.success(
        `Facture ${result.number} créée (${ids.length} BL agrégés)`,
      );
      await navigate({
        to: "/app/invoices/$invoiceId",
        params: { invoiceId: result.id },
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur conversion facture",
      );
    } finally {
      setSaving(false);
    }
  }, [canSubmit, convert, navigate, safeRows, selectedIds]);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && (event.key === "s" || event.key === "S")) {
        event.preventDefault();
        void handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit]);

  return (
    <Layout size="xl">
      <LayoutHeader>
        <LayoutTitle>Nouvelle facture agrégée</LayoutTitle>
        <Typography variant="muted">
          Sélection multi-BL livrés du même client — 1 facture mensuelle
        </Typography>
      </LayoutHeader>
      <LayoutContent>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <ClientPicker
              selected={client}
              onPickClient={setClient}
              onClear={() => setClient(null)}
            />

            {client === null ? (
              <div
                className="border-border bg-muted/30 rounded-md border border-dashed px-4 py-8 text-center"
                data-testid="aggregate-no-client"
              >
                <Typography variant="muted">
                  Sélectionnez un client pour voir ses BL livrés.
                </Typography>
              </div>
            ) : loading ? (
              <div
                className="flex flex-col gap-2"
                data-testid="aggregate-loading"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full rounded" />
                ))}
              </div>
            ) : (
              <>
                <InvoiceableBLsTable
                  rows={safeRows}
                  selectedIds={selectedIds}
                  onToggle={toggleOne}
                  onToggleAll={toggleAll}
                />
                <SelectedSummaryFooter
                  rows={safeRows}
                  selectedIds={selectedIds}
                />
                <div className="flex items-center justify-end gap-2">
                  <span className="text-muted-foreground font-mono text-[12px]">
                    Ctrl+S pour valider
                  </span>
                  <Button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!canSubmit}
                    data-testid="aggregate-submit"
                    className="h-8 px-3 text-[13px]"
                  >
                    {saving
                      ? "Enregistrement…"
                      : `Facturer ces ${selectedCount} BL`}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </LayoutContent>
    </Layout>
  );
}
