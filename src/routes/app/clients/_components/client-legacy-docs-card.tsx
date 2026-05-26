import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ClientLegacyDocumentDto } from "@convex/legacy/dto/clientLegacyDocument";

type Kind = "all" | "invoice" | "quotation" | "delivery_form";

const KIND_LABEL: Record<Exclude<Kind, "all">, string> = {
  invoice: "Facture",
  quotation: "Devis",
  delivery_form: "BL",
};

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ClientLegacyDocsCard({
  rows,
  enabled,
  filter,
  onFilterChange,
}: {
  rows: ClientLegacyDocumentDto[];
  enabled: boolean;
  filter: Kind;
  onFilterChange: (next: Kind) => void;
}) {
  return (
    <Card className={enabled ? "border-primary/60" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          Historique Heritage (lecture seule)
        </CardTitle>
        <div className="flex items-center gap-1">
          {(["all", "invoice", "quotation", "delivery_form"] as Kind[]).map(
            (k) => (
              <Button
                key={k}
                type="button"
                size="sm"
                variant={filter === k ? "default" : "outline"}
                className="h-7 px-2 text-[11px]"
                onClick={() => onFilterChange(k)}
              >
                {k === "all" ? "Tous" : KIND_LABEL[k]}
              </Button>
            ),
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-muted-foreground text-[13px]">
            Aucun document.
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="text-muted-foreground grid grid-cols-[80px_70px_1fr_120px_120px] gap-x-3 text-[11px]">
              <div>N°</div>
              <div>Date</div>
              <div>Commentaire</div>
              <div className="text-right">HT</div>
              <div className="text-right">TTC</div>
            </div>
            {rows.map((doc) => (
              <div
                key={doc.id}
                className="border-border/40 grid grid-cols-[80px_70px_1fr_120px_120px] gap-x-3 border-t py-1 font-mono text-[12px]"
              >
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="px-1 text-[10px]">
                    {KIND_LABEL[doc.kind]}
                  </Badge>
                </div>
                <div className="self-center">
                  {formatDate(doc.document_date)}
                </div>
                <div className="self-center truncate text-[11px]">
                  {doc.comment ?? doc.legacy_number}
                </div>
                <div className="self-center text-right tabular-nums">
                  {formatAmount(doc.total_ht)} €
                </div>
                <div className="self-center text-right tabular-nums">
                  {formatAmount(doc.total_ttc)} €
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function useLegacyDocsFilter() {
  const [filter, setFilter] = useState<Kind>("all");
  return { filter, setFilter };
}
