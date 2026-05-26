import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { DeliveryFormsListSkeleton } from "./_components/delivery-forms-skeleton";

export const Route = createFileRoute("/app/delivery-forms")({
  component: DeliveryFormsLayout,
  pendingComponent: DeliveryFormsListSkeleton,
});

function DeliveryFormsLayout() {
  const navigate = useNavigate();
  const router = useRouter();

  useKeyboardScope("app-delivery-forms", {
    F2: () => {
      void navigate({ to: "/app/delivery-forms/new" });
    },
    F5: () => {
      void router.invalidate();
    },
  });

  return <Outlet />;
}
