import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/nowts/typography";
import type { InvoiceDetailDto } from "@convex/invoices/dto/invoiceDetail";

const STATUS_LABEL: Record<InvoiceDetailDto["status"], string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

const STATUS_VARIANT: Record<
  InvoiceDetailDto["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  sent: "default",
  paid: "outline",
  overdue: "destructive",
  cancelled: "destructive",
};

function formatDate(ms: number | null): string {
  if (ms === null) return "—";
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InvoiceDetail({ invoice }: { invoice: InvoiceDetailDto }) {
  const blSummary = invoice.deliveryForms
    .map(
      (df) =>
        `${df.number}${df.deliveredAt ? ` (livré ${formatDate(df.deliveredAt)})` : ""}`,
    )
    .join(", ");
  const isAggregate = invoice.deliveryForms.length > 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-4">
          <CardTitle className="font-mono text-base">
            Facture {invoice.number}
          </CardTitle>
          <Badge variant={STATUS_VARIANT[invoice.status]}>
            {STATUS_LABEL[invoice.status]}
          </Badge>
        </div>
        <CardDescription>
          {invoice.client.name} · échéance{" "}
          <span className="font-mono">{formatDate(invoice.dueDate)}</span> ·{" "}
          {isAggregate
            ? `${invoice.deliveryForms.length} BL agrégés : `
            : "BL "}
          <span className="font-mono">{blSummary}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoice.deliveryForms.map((df, dfIndex) => (
          <div key={df.id} className="mb-6 last:mb-0">
            {isAggregate ? (
              <Typography variant="muted" className="mb-2 font-mono text-xs">
                BL {df.number}
                {df.deliveredAt ? ` — livré ${formatDate(df.deliveredAt)}` : ""}
              </Typography>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1.5 text-[13px]">#</TableHead>
                  <TableHead className="py-1.5 text-[13px]">Code</TableHead>
                  <TableHead className="py-1.5 text-[13px]">
                    Désignation
                  </TableHead>
                  <TableHead className="py-1.5 text-right text-[13px]">
                    Qté
                  </TableHead>
                  <TableHead className="py-1.5 text-right text-[13px]">
                    PU HT
                  </TableHead>
                  <TableHead className="py-1.5 text-right text-[13px]">
                    TVA
                  </TableHead>
                  <TableHead className="py-1.5 text-right text-[13px]">
                    Total HT
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {df.lines.map((line, i) => (
                  <TableRow key={`${dfIndex}-${line.product_id}-${i}`}>
                    <TableCell className="py-1.5 font-mono text-[13px] tabular-nums">
                      {i + 1}
                    </TableCell>
                    <TableCell className="py-1.5 font-mono text-[13px]">
                      {line.product_code}
                    </TableCell>
                    <TableCell className="py-1.5 text-[13px]">
                      {line.product_name}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                      {line.quantity}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                      {formatAmount(line.unit_price_ht)} €
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                      {formatAmount(line.vat_rate)} %
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                      {formatAmount(line.line_total_ht)} €
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
        <div className="mt-3 flex justify-end gap-6">
          <Typography variant="muted">
            Total HT : {formatAmount(invoice.total_ht)} €
          </Typography>
          <Typography variant="large" className="font-mono tabular-nums">
            Total TTC : {formatAmount(invoice.total_ttc)} €
          </Typography>
        </div>
      </CardContent>
    </Card>
  );
}
