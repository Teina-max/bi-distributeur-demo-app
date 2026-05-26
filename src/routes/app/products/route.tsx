import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { ProductsListSkeleton } from "./_components/products-skeleton";

export const Route = createFileRoute("/app/products")({
  component: ProductsLayout,
  pendingComponent: ProductsListSkeleton,
});

function ProductsLayout() {
  const router = useRouter();

  useKeyboardScope("app-products", {
    F5: () => {
      void router.invalidate();
    },
  });

  return <Outlet />;
}
