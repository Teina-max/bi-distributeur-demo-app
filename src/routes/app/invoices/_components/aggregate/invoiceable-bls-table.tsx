import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/nowts/typography";
import { useTableKeyboardNav } from "@/hooks/use-table-keyboard-nav";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { cn } from "@/lib/utils";
import type { DeliveryFormInvoiceableDto } from "@convex/delivery_forms/dto/deliveryFormInvoiceable";

type Props = {
  rows: readonly DeliveryFormInvoiceableDto[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
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

export function InvoiceableBLsTable({
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
}: Props) {
  const navRows = React.useMemo(
    () => rows.map((r) => ({ id: r.id as string })),
    [rows],
  );

  const { activeIndex, getRowProps } = useTableKeyboardNav(navRows, {
    scopeId: "invoices-aggregate-table",
    enabled: rows.length > 0,
  });

  useKeyboardScope("invoices-aggregate-table-toggle", {
    " ":
      rows.length > 0
        ? () => {
            if (activeIndex < 0 || activeIndex >= rows.length) return;
            onToggle(rows[activeIndex].id as string);
          }
        : undefined,
  });

  React.useEffect(() => {
    if (rows.length === 0) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        onToggleAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rows.length, onToggleAll]);

  if (rows.length === 0) {
    return (
      <div
        className="border-border bg-muted/30 rounded-md border border-dashed px-4 py-8 text-center"
        data-testid="invoiceable-bls-empty"
      >
        <Typography variant="muted">
          Aucun BL à facturer pour ce client.
        </Typography>
      </div>
    );
  }

  const allSelected = rows.every((r) => selectedIds.has(r.id as string));
  const someSelected = !allSelected && rows.some((r) => selectedIds.has(r.id as string));

  return (
    <div data-testid="invoiceable-bls-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 py-1.5">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={() => onToggleAll()}
                aria-label="Sélectionner tous les BL"
                data-testid="invoiceable-bls-toggle-all"
              />
            </TableHead>
            <TableHead className="py-1.5 text-[13px]">N° BL</TableHead>
            <TableHead className="py-1.5 text-[13px]">Livré le</TableHead>
            <TableHead className="py-1.5 text-right text-[13px]">
              Total HT
            </TableHead>
            <TableHead className="py-1.5 text-right text-[13px]">
              Total TTC
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const props = getRowProps(i);
            const checked = selectedIds.has(row.id as string);
            return (
              <TableRow
                key={row.id}
                data-testid={`invoiceable-bl-row-${row.id}`}
                data-active={props["data-active"]}
                aria-selected={props["aria-selected"]}
                tabIndex={props.tabIndex}
                className={cn(
                  "h-7",
                  props["data-active"] && "bg-muted",
                )}
              >
                <TableCell className="py-1 align-middle">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(row.id as string)}
                    aria-label={`Sélectionner BL ${row.number}`}
                    data-testid={`invoiceable-bl-checkbox-${row.id}`}
                  />
                </TableCell>
                <TableCell className="py-1 font-mono text-[13px]">
                  {row.number}
                </TableCell>
                <TableCell className="py-1 font-mono text-[13px] tabular-nums">
                  {formatDate(row.deliveredAt)}
                </TableCell>
                <TableCell className="py-1 text-right font-mono text-[13px] tabular-nums">
                  {formatAmount(row.total_ht)} €
                </TableCell>
                <TableCell className="py-1 text-right font-mono text-[13px] tabular-nums">
                  {formatAmount(row.total_ttc)} €
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
