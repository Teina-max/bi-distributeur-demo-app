import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { InvoicesListSkeleton } from "./_components/invoices-skeleton";

export const Route = createFileRoute("/app/invoices")({
  component: InvoicesLayout,
  pendingComponent: InvoicesListSkeleton,
});

function InvoicesLayout() {
  const navigate = useNavigate();
  const router = useRouter();

  useKeyboardScope("app-invoices", {
    F2: () => {
      void navigate({ to: "/app/invoices/new" });
    },
    F5: () => {
      void router.invalidate();
    },
  });

  return <Outlet />;
}
