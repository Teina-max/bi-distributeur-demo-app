import { useCallback, useMemo, useState } from "react";
import type {
  EmptySupplyLine,
  FilledSupplyLine,
  ProductSupplySuggestion,
  SupplyDraftLine,
  SupplyLineItemPayload,
} from "./types";

const emptyLine = (): EmptySupplyLine => ({ kind: "empty" });

const isFilled = (line: SupplyDraftLine): line is FilledSupplyLine =>
  line.kind === "filled";

const ensureTrailingEmpty = (
  lines: readonly SupplyDraftLine[],
): SupplyDraftLine[] => {
  const next = [...lines];
  if (next.length === 0 || next[next.length - 1].kind !== "empty") {
    next.push(emptyLine());
  }
  return next;
};

const toFilledLine = (
  product: ProductSupplySuggestion,
  quantity_ordered: number,
  unit_purchase_price_ht: number,
  vat_rate: number,
): FilledSupplyLine => ({
  kind: "filled",
  product_id: product.id,
  product_code: product.code,
  product_name: product.name,
  quantity_ordered,
  unit_purchase_price_ht,
  vat_rate,
});

const fromPayload = (line: SupplyLineItemPayload): FilledSupplyLine => ({
  kind: "filled",
  product_id: line.product_id,
  product_code: line.product_code,
  product_name: line.product_name,
  quantity_ordered: line.quantity_ordered,
  unit_purchase_price_ht: line.unit_purchase_price_ht,
  vat_rate: line.vat_rate,
});

export type UsePurchaseOrderLinesResult = {
  lines: readonly SupplyDraftLine[];
  filled: readonly FilledSupplyLine[];
  setProduct: (
    idx: number,
    product: ProductSupplySuggestion,
    options?: {
      quantity_ordered?: number;
      unit_purchase_price_ht?: number;
      vat_rate_override?: number;
    },
  ) => void;
  setQuantity: (idx: number, quantity_ordered: number) => void;
  setPurchasePrice: (idx: number, unit_purchase_price_ht: number) => void;
  setVatOverride: (idx: number, vat_rate: number) => void;
  removeLine: (idx: number) => void;
  payload: SupplyLineItemPayload[];
  reset: (initial?: readonly SupplyLineItemPayload[]) => void;
};

export function usePurchaseOrderLines(
  initialLines: readonly SupplyLineItemPayload[] = [],
): UsePurchaseOrderLinesResult {
  const [lines, setLines] = useState<readonly SupplyDraftLine[]>(() =>
    ensureTrailingEmpty(initialLines.map(fromPayload)),
  );

  const setProduct = useCallback<UsePurchaseOrderLinesResult["setProduct"]>(
    (idx, product, options = {}) => {
      setLines((prev) => {
        const next: SupplyDraftLine[] = [...prev];
        const quantity_ordered = options.quantity_ordered ?? 1;
        const unit_purchase_price_ht = options.unit_purchase_price_ht ?? 0;
        const vat_rate = options.vat_rate_override ?? product.vat_rate;
        next[idx] = toFilledLine(
          product,
          quantity_ordered,
          unit_purchase_price_ht,
          vat_rate,
        );
        return ensureTrailingEmpty(next);
      });
    },
    [],
  );

  const setQuantity = useCallback((idx: number, quantity_ordered: number) => {
    setLines((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const target = prev[idx];
      if (target.kind !== "filled") return prev;
      const next: SupplyDraftLine[] = [...prev];
      next[idx] = { ...target, quantity_ordered };
      return next;
    });
  }, []);

  const setPurchasePrice = useCallback(
    (idx: number, unit_purchase_price_ht: number) => {
      setLines((prev) => {
        if (idx < 0 || idx >= prev.length) return prev;
        const target = prev[idx];
        if (target.kind !== "filled") return prev;
        const next: SupplyDraftLine[] = [...prev];
        next[idx] = { ...target, unit_purchase_price_ht };
        return next;
      });
    },
    [],
  );

  const setVatOverride = useCallback((idx: number, vat_rate: number) => {
    setLines((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const target = prev[idx];
      if (target.kind !== "filled") return prev;
      const next: SupplyDraftLine[] = [...prev];
      next[idx] = { ...target, vat_rate };
      return next;
    });
  }, []);

  const removeLine = useCallback((idx: number) => {
    setLines((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const target = prev[idx];
      if (target.kind === "empty" && prev.length === 1) return prev;
      if (target.kind === "empty" && idx === prev.length - 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      return ensureTrailingEmpty(next);
    });
  }, []);

  const filled = useMemo(() => lines.filter(isFilled), [lines]);

  const payload = useMemo<SupplyLineItemPayload[]>(
    () =>
      filled.map((line) => ({
        product_id: line.product_id,
        product_code: line.product_code,
        product_name: line.product_name,
        quantity_ordered: line.quantity_ordered,
        unit_purchase_price_ht: line.unit_purchase_price_ht,
        vat_rate: line.vat_rate,
      })),
    [filled],
  );

  const reset = useCallback(
    (initial: readonly SupplyLineItemPayload[] = []) => {
      setLines(ensureTrailingEmpty(initial.map(fromPayload)));
    },
    [],
  );

  return {
    lines,
    filled,
    setProduct,
    setQuantity,
    setPurchasePrice,
    setVatOverride,
    removeLine,
    payload,
    reset,
  };
}
