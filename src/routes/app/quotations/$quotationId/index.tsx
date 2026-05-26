import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvertActions } from "@/features/conversions/convert-actions";
import { QuotationForm } from "../_components/quotation-form";
import { QuotationFormSkeleton } from "../_components/quotations-skeleton";

export const Route = createFileRoute("/app/quotations/$quotationId/")({
  component: QuotationDetail,
  pendingComponent: QuotationFormSkeleton,
});

function QuotationDetail() {
  const { quotationId } = Route.useParams();
  const draft = useQuery(api.quotations.queries.getById, {
    id: quotationId as Id<"quotations">,
  });

  if (draft === undefined) return <QuotationFormSkeleton />;

  const status = draft.status as
    | "draft"
    | "sent"
    | "accepted"
    | "converted_to_delivery"
    | "cancelled";
  const isConvertible = status === "draft" || status === "accepted";

  return (
    <>
      <QuotationForm
        initialQuotationId={draft.id}
        initialNumber={draft.number}
        initialClient={{
          id: draft.client.id,
          code: draft.client.code,
          name: draft.client.name,
        }}
        initialLines={draft.lines}
        initialStatus={status}
      />
      {isConvertible ? <ConvertActions kind="bl" sourceId={draft.id} /> : null}
    </>
  );
}
