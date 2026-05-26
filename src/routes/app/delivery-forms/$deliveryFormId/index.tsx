import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Layout, LayoutContent } from "@/features/page/layout";
import { Typography } from "@/components/nowts/typography";
import { CancelDeliveryFormAction } from "@/features/cancellation/cancel-delivery-form-action";
import { DownloadDeliveryFormPdfAction } from "@/features/delivery-form-pdf/download-delivery-form-pdf-action";
import { DeliveryFormDetail } from "../_components/delivery-form-detail";
import { DeliveryFormDetailSkeleton } from "../_components/delivery-forms-skeleton";

export const Route = createFileRoute("/app/delivery-forms/$deliveryFormId/")({
  component: DeliveryFormDetailRoute,
  pendingComponent: DeliveryFormDetailSkeleton,
});

const triggerKey = (key: string) =>
  window.dispatchEvent(new KeyboardEvent("keydown", { key }));

function DeliveryFormDetailRoute() {
  const { deliveryFormId } = Route.useParams();
  const navigate = useNavigate();
  const id = deliveryFormId as unknown as Id<"delivery_forms">;
  const deliveryForm = useQuery(api.delivery_forms.queries.getById, { id });
  const movements = useQuery(api.stock_movements.queries.listByDeliveryForm, {
    delivery_form_id: id,
  });

  if (deliveryForm === undefined || movements === undefined) {
    return <DeliveryFormDetailSkeleton />;
  }
  if (deliveryForm === null) {
    return (
      <Layout size="xl">
        <LayoutContent>
          <Typography variant="muted">Bon de livraison introuvable.</Typography>
        </LayoutContent>
      </Layout>
    );
  }

  const canInvoice = deliveryForm.status === "delivered";

  return (
    <Layout size="xl">
      <LayoutContent>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-end gap-1">
            {canInvoice ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => triggerKey("F9")}
                className="h-7 px-2 text-xs"
                data-testid="bl-detail-action-invoice"
              >
                <span>Facturer</span>
                <kbd className="bg-muted text-muted-foreground ml-1.5 inline-flex h-4 items-center rounded border px-1 font-mono text-[10px]">
                  F9
                </kbd>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void navigate({ to: "/app/delivery-forms" })}
              className="h-7 px-2 text-xs"
              data-testid="bl-detail-action-back"
            >
              <span>Retour</span>
              <kbd className="bg-muted text-muted-foreground ml-1.5 inline-flex h-4 items-center rounded border px-1 font-mono text-[10px]">
                Echap
              </kbd>
            </Button>
            <DownloadDeliveryFormPdfAction deliveryForm={deliveryForm} />
            <CancelDeliveryFormAction
              sourceId={deliveryForm.id}
              sourceNumber={deliveryForm.number}
              status={deliveryForm.status}
            />
          </div>
          <DeliveryFormDetail
            deliveryForm={deliveryForm}
            stockMovements={movements}
          />
        </div>
      </LayoutContent>
    </Layout>
  );
}
