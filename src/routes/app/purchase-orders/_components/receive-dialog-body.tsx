import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Id } from "@convex/_generated/dataModel";
import type { PurchaseOrderDetailDto } from "@convex/purchase_orders/dto/purchaseOrderDetail";

export type ReceiveDraftEntry = {
  product_id: Id<"products">;
  product_code: string;
  product_name: string;
  ordered: number;
  alreadyReceived: number;
  remaining: number;
  draftDelta: number;
  invalid: boolean;
};

type Props = {
  lines: PurchaseOrderDetailDto["lines"];
  formId?: string;
  onSubmitReceipts: (
    receipts: { product_id: Id<"products">; delta: number }[],
  ) => Promise<void> | void;
};

const initialDrafts = (
  lines: PurchaseOrderDetailDto["lines"],
): ReceiveDraftEntry[] =>
  lines.map((line) => {
    const remaining = line.quantity_ordered - line.quantity_received;
    return {
      product_id: line.product_id as unknown as Id<"products">,
      product_code: line.product_code,
      product_name: line.product_name,
      ordered: line.quantity_ordered,
      alreadyReceived: line.quantity_received,
      remaining,
      draftDelta: remaining > 0 ? remaining : 0,
      invalid: false,
    };
  });

const DENSE_INPUT_CLASS = "h-7 text-[13px] px-2 font-mono w-20 text-right";

export function ReceiveDialogBody({
  lines,
  formId = "receive-form",
  onSubmitReceipts,
}: Props) {
  const [drafts, setDrafts] = React.useState<ReceiveDraftEntry[]>(() =>
    initialDrafts(lines),
  );
  const [submitting, setSubmitting] = React.useState(false);

  const handleChange = (idx: number, raw: string) => {
    const parsed = Number.parseFloat(raw);
    setDrafts((prev) => {
      const next = [...prev];
      const target = prev[idx];
      const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      const invalid = value > target.remaining;
      next[idx] = { ...target, draftDelta: value, invalid };
      return next;
    });
  };

  const hasInvalid = drafts.some((d) => d.invalid);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (hasInvalid) return;
    const receipts = drafts
      .filter((d) => d.draftDelta > 0)
      .map((d) => ({ product_id: d.product_id, delta: d.draftDelta }));
    if (receipts.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmitReceipts(receipts);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
      data-testid="receive-dialog-form"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 px-2 text-xs">Code</TableHead>
            <TableHead className="h-8 px-2 text-xs">Désignation</TableHead>
            <TableHead className="h-8 px-2 text-right text-xs">Cmd.</TableHead>
            <TableHead className="h-8 px-2 text-right text-xs">
              Déjà reçu
            </TableHead>
            <TableHead className="h-8 px-2 text-right text-xs">
              Reçu maintenant
            </TableHead>
            <TableHead className="h-8 px-2 text-right text-xs">
              Restant
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drafts.map((d, idx) => (
            <TableRow key={String(d.product_id)}>
              <TableCell className="px-2 py-1 font-mono text-[13px]">
                {d.product_code}
              </TableCell>
              <TableCell className="px-2 py-1 text-[13px]">
                {d.product_name}
              </TableCell>
              <TableCell className="px-2 py-1 text-right font-mono text-[13px]">
                {d.ordered}
              </TableCell>
              <TableCell className="px-2 py-1 text-right font-mono text-[13px]">
                {d.alreadyReceived}
              </TableCell>
              <TableCell className="px-2 py-1 text-right font-mono text-[13px]">
                <Input
                  type="number"
                  min={0}
                  max={d.remaining}
                  step="any"
                  value={d.draftDelta}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  aria-label={`Reçu maintenant ligne ${idx + 1}`}
                  data-testid={`receive-input-${idx}`}
                  aria-invalid={d.invalid}
                  className={DENSE_INPUT_CLASS}
                  autoFocus={idx === 0}
                />
              </TableCell>
              <TableCell
                className={`px-2 py-1 text-right font-mono text-[13px] ${
                  d.invalid ? "text-destructive" : ""
                }`}
                data-testid={`receive-remaining-${idx}`}
              >
                {d.remaining - d.draftDelta}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasInvalid ? (
        <p
          className="text-destructive font-mono text-xs"
          data-testid="receive-error"
        >
          Au moins une ligne dépasse le restant à recevoir.
        </p>
      ) : null}
      {submitting ? (
        <p className="text-muted-foreground font-mono text-xs">Réception…</p>
      ) : null}
    </form>
  );
}
