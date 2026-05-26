import { useCallback, useMemo, useState } from "react";
import type {
  DraftLine,
  EmptyLine,
  FilledLine,
  LineItemPayload,
  ProductSuggestion,
} from "./types";

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const emptyLine = (): EmptyLine => ({ kind: "empty" });

const isFilled = (line: DraftLine): line is FilledLine =>
  line.kind === "filled";

const ensureTrailingEmpty = (lines: readonly DraftLine[]): DraftLine[] => {
  const next = [...lines];
  if (next.length === 0 || next[next.length - 1].kind !== "empty") {
    next.push(emptyLine());
  }
  return next;
};

type SetProductOptions = {
  vat_rate_override?: number;
};

export type UseQuotationLinesResult = {
  lines: readonly DraftLine[];
  filled: readonly FilledLine[];
  setProduct: (
    idx: number,
    product: ProductSuggestion,
    quantity?: number,
    options?: SetProductOptions,
  ) => void;
  setQuantity: (idx: number, quantity: number) => void;
  setVatOverride: (idx: number, vat_rate: number) => void;
  removeLine: (idx: number) => void;
  payload: LineItemPayload[];
  reset: (initial?: readonly LineItemPayload[]) => void;
};

const toFilledLine = (
  product: ProductSuggestion,
  quantity: number,
  vat_rate: number,
): FilledLine => ({
  kind: "filled",
  product_id: product.id,
  product_code: product.code,
  product_name: product.name,
  quantity,
  unit_price_ht: product.price_ht,
  vat_rate,
  line_total_ht: round2(quantity * product.price_ht),
});

const fromPayload = (line: LineItemPayload): FilledLine => ({
  kind: "filled",
  product_id: line.product_id,
  product_code: line.product_code,
  product_name: line.product_name,
  quantity: line.quantity,
  unit_price_ht: line.unit_price_ht,
  vat_rate: line.vat_rate,
  line_total_ht: line.line_total_ht,
});

export function useQuotationLines(
  initialLines: readonly LineItemPayload[] = [],
): UseQuotationLinesResult {
  const [lines, setLines] = useState<readonly DraftLine[]>(() =>
    ensureTrailingEmpty(initialLines.map(fromPayload)),
  );

  const setProduct = useCallback(
    (
      idx: number,
      product: ProductSuggestion,
      quantity = 1,
      options: SetProductOptions = {},
    ) => {
      setLines((prev) => {
        const next: DraftLine[] = [...prev];
        const vat_rate = options.vat_rate_override ?? product.vat_rate;
        next[idx] = toFilledLine(product, quantity, vat_rate);
        return ensureTrailingEmpty(next);
      });
    },
    [],
  );

  const setQuantity = useCallback((idx: number, quantity: number) => {
    setLines((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const target = prev[idx];
      if (target.kind !== "filled") return prev;
      const next: DraftLine[] = [...prev];
      next[idx] = {
        ...target,
        quantity,
        line_total_ht: round2(quantity * target.unit_price_ht),
      };
      return next;
    });
  }, []);

  const setVatOverride = useCallback((idx: number, vat_rate: number) => {
    setLines((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const target = prev[idx];
      if (target.kind !== "filled") return prev;
      const next: DraftLine[] = [...prev];
      next[idx] = { ...target, vat_rate };
      return next;
    });
  }, []);

  const removeLine = useCallback((idx: number) => {
    setLines((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const target = prev[idx];
      // Never remove the only/last empty line
      if (target.kind === "empty" && prev.length === 1) return prev;
      if (target.kind === "empty" && idx === prev.length - 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      return ensureTrailingEmpty(next);
    });
  }, []);

  const filled = useMemo(() => lines.filter(isFilled), [lines]);

  const payload = useMemo<LineItemPayload[]>(
    () =>
      filled.map((line) => ({
        product_id: line.product_id,
        product_code: line.product_code,
        product_name: line.product_name,
        quantity: line.quantity,
        unit_price_ht: line.unit_price_ht,
        vat_rate: line.vat_rate,
        line_total_ht: line.line_total_ht,
      })),
    [filled],
  );

  const reset = useCallback((initial: readonly LineItemPayload[] = []) => {
    setLines(ensureTrailingEmpty(initial.map(fromPayload)));
  }, []);

  return {
    lines,
    filled,
    setProduct,
    setQuantity,
    setVatOverride,
    removeLine,
    payload,
    reset,
  };
}
