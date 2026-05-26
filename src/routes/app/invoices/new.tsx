import { createFileRoute } from "@tanstack/react-router";
import { InvoiceAggregateForm } from "./_components/aggregate/invoice-aggregate-form";
import { InvoiceAggregateSkeleton } from "./_components/aggregate/invoice-aggregate-skeleton";

export const Route = createFileRoute("/app/invoices/new")({
  component: NewInvoicePage,
  pendingComponent: InvoiceAggregateSkeleton,
});

function NewInvoicePage() {
  return <InvoiceAggregateForm />;
}
