import { Link } from "@tanstack/react-router";
import type { Id } from "@convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";

export function formatAmount(value: number, fractionDigits = 0): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatDate(ms: number | null): string {
  if (ms === null) return "—";
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function DrawerLoading() {
  return (
    <div className="flex flex-col gap-2 py-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-5 w-full rounded" />
      ))}
    </div>
  );
}

export function ClientLink({
  id,
  children,
}: {
  id: Id<"clients">;
  children: React.ReactNode;
}) {
  return (
    <Link
      to="/app/clients/$clientId"
      params={{ clientId: id }}
      className="hover:bg-muted/50 grid w-full font-mono"
    >
      {children}
    </Link>
  );
}
