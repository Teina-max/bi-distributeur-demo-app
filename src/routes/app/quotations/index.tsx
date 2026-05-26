import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import { QuotationsListSkeleton } from "./_components/quotations-skeleton";
import { QuotationsListTable } from "./_components/quotations-list-table";

export const Route = createFileRoute("/app/quotations/")({
  component: QuotationsIndex,
  pendingComponent: QuotationsListSkeleton,
});

function QuotationsIndex() {
  const navigate = useNavigate();
  const items = useQuery(api.quotations.queries.listRecent, {});

  if (items === undefined) return <QuotationsListSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Typography variant="h2">Devis récents</Typography>
        <Button
          size="sm"
          onClick={() => void navigate({ to: "/app/quotations/new" })}
          data-testid="new-quotation-link"
        >
          Nouveau devis
          <kbd className="bg-primary-foreground/20 text-primary-foreground ml-2 inline-flex h-4 items-center rounded border border-current/30 px-1 font-mono text-[10px]">
            F2
          </kbd>
        </Button>
      </div>
      {items.length === 0 ? (
        <Typography variant="muted" className="text-sm">
          Aucun devis pour le moment. F2 pour démarrer.
        </Typography>
      ) : (
        <QuotationsListTable items={items} />
      )}
    </div>
  );
}
