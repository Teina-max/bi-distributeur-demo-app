import { createFileRoute } from "@tanstack/react-router";
import { QuotationForm } from "./_components/quotation-form";
import { QuotationFormSkeleton } from "./_components/quotations-skeleton";

export const Route = createFileRoute("/app/quotations/new")({
  component: NewQuotationPage,
  pendingComponent: QuotationFormSkeleton,
});

function NewQuotationPage() {
  return <QuotationForm />;
}
