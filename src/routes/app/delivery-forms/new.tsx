import { createFileRoute } from "@tanstack/react-router";
import { DeliveryFormNewForm } from "./_components/delivery-form-new-form";
import { DeliveryFormNewSkeleton } from "./_components/delivery-form-new-skeleton";

export const Route = createFileRoute("/app/delivery-forms/new")({
  component: NewDeliveryFormPage,
  pendingComponent: DeliveryFormNewSkeleton,
});

function NewDeliveryFormPage() {
  return <DeliveryFormNewForm />;
}
