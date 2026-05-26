import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type {
  ProductSupplySuggestion,
  SupplyDraftLine,
} from "@/features/supply/types";
import { PurchaseOrderLineRow } from "./purchase-order-line-row";

type Props = {
  lines: readonly SupplyDraftLine[];
  onPickProduct: (idx: number, product: ProductSupplySuggestion) => void;
  onQuantityChange: (idx: number, quantity_ordered: number) => void;
  onPurchasePriceChange: (idx: number, unit_purchase_price_ht: number) => void;
  onRemove: (idx: number) => void;
  onVatOverride: (idx: number) => void;
  firstCodeInputRef?: React.Ref<HTMLInputElement>;
};

export function PurchaseOrderLinesTable({
  lines,
  onPickProduct,
  onQuantityChange,
  onPurchasePriceChange,
  onRemove,
  onVatOverride,
  firstCodeInputRef,
}: Props) {
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);
  const [codeDraft, setCodeDraft] = React.useState("");
  const debounced = useDebouncedValue(codeDraft, 80);

  const trimmed = debounced.trim();
  const enabled = trimmed.length >= 2 && activeIdx !== null;

  const suggestions =
    useQuery(
      api.purchase_orders.queries.listProductSuggestionsForSupply,
      enabled ? { query: trimmed } : "skip",
    ) ?? [];

  const handleCodeChange = (idx: number, code: string) => {
    setActiveIdx(idx);
    setCodeDraft(code);
  };

  const handlePickProduct = (idx: number, product: ProductSupplySuggestion) => {
    onPickProduct(idx, product);
    setCodeDraft("");
    setActiveIdx(idx + 1);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 px-2 text-xs">Code</TableHead>
          <TableHead className="h-8 px-2 text-xs">Désignation</TableHead>
          <TableHead className="h-8 px-2 text-right text-xs">
            Qté cmd.
          </TableHead>
          <TableHead className="h-8 px-2 text-right text-xs">
            PU achat HT
          </TableHead>
          <TableHead className="h-8 px-2 text-right text-xs">TVA</TableHead>
          <TableHead className="h-8 px-2 text-right text-xs">
            Total HT
          </TableHead>
          <TableHead className="h-8 w-8 px-2 text-xs">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line, idx) => (
          <PurchaseOrderLineRow
            key={idx}
            index={idx}
            line={line}
            suggestions={activeIdx === idx ? suggestions : []}
            onCodeChange={(code) => handleCodeChange(idx, code)}
            onPickProduct={handlePickProduct}
            onQuantityChange={onQuantityChange}
            onPurchasePriceChange={onPurchasePriceChange}
            onRemove={onRemove}
            onVatOverride={onVatOverride}
            codeDraft={activeIdx === idx ? codeDraft : ""}
            codeInputRef={idx === 0 ? firstCodeInputRef : undefined}
          />
        ))}
      </TableBody>
    </Table>
  );
}
