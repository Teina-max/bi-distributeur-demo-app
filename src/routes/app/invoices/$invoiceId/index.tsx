import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Layout, LayoutContent } from "@/features/page/layout";
import { Typography } from "@/components/nowts/typography";
import { CancelInvoiceAction } from "@/features/cancellation/cancel-invoice-action";
import { DownloadInvoicePdfAction } from "@/features/invoice-pdf/download-invoice-pdf-action";
import { InvoiceStatusActions } from "@/features/invoice-status/invoice-status-actions";
import { InvoiceDetail } from "../_components/invoice-detail";
import { InvoiceDetailSkeleton } from "../_components/invoices-skeleton";

export const Route = createFileRoute("/app/invoices/$invoiceId/")({
  component: InvoiceDetailRoute,
  pendingComponent: InvoiceDetailSkeleton,
});

function InvoiceDetailRoute() {
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const id = invoiceId as unknown as Id<"invoices">;
  const invoice = useQuery(api.invoices.queries.getById, { id });

  if (invoice === undefined) return <InvoiceDetailSkeleton />;
  if (invoice === null) {
    return (
      <Layout size="xl">
        <LayoutContent>
          <Typography variant="muted">Facture introuvable.</Typography>
        </LayoutContent>
      </Layout>
    );
  }
  return (
    <Layout size="xl">
      <LayoutContent>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void navigate({ to: "/app/invoices" })}
              className="h-7 px-2 text-xs"
              data-testid="invoice-detail-action-back"
            >
              <span>Retour</span>
              <kbd className="bg-muted text-muted-foreground ml-1.5 inline-flex h-4 items-center rounded border px-1 font-mono text-[10px]">
                Echap
              </kbd>
            </Button>
            <DownloadInvoicePdfAction invoice={invoice} />
            <InvoiceStatusActions invoice={invoice} />
            <CancelInvoiceAction
              sourceId={invoice.id}
              sourceNumber={invoice.number}
              status={invoice.status}
            />
          </div>
          <InvoiceDetail invoice={invoice} />
        </div>
      </LayoutContent>
    </Layout>
  );
}
