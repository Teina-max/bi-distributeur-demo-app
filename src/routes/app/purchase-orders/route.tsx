import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { PurchaseOrdersListSkeleton } from "./_components/purchase-orders-skeleton";

export const Route = createFileRoute("/app/purchase-orders")({
  component: PurchaseOrdersLayout,
  pendingComponent: PurchaseOrdersListSkeleton,
});

function PurchaseOrdersLayout() {
  const navigate = useNavigate();
  const router = useRouter();

  useKeyboardScope("app-purchase-orders", {
    F2: () => {
      void navigate({ to: "/app/purchase-orders/new" });
    },
    F5: () => {
      void router.invalidate();
    },
  });

  return <Outlet />;
}
