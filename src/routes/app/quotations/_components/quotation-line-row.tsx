import type * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatEUR, formatQuantity } from "@/features/quotations/format-amount";
import type { DraftLine, ProductSuggestion } from "@/features/quotations/types";

type Props = {
  index: number;
  line: DraftLine;
  suggestions: readonly ProductSuggestion[];
  onCodeChange: (code: string) => void;
  onPickProduct: (idx: number, product: ProductSuggestion) => void;
  onQuantityChange: (idx: number, quantity: number) => void;
  onRemove: (idx: number) => void;
  onVatOverride: (idx: number) => void;
  codeInputRef?: React.Ref<HTMLInputElement>;
  qtyInputRef?: React.Ref<HTMLInputElement>;
  codeDraft: string;
};

const findExactProduct = (
  code: string,
  suggestions: readonly ProductSuggestion[],
): ProductSuggestion | undefined =>
  suggestions.find(
    (product) => product.code.toLowerCase() === code.trim().toLowerCase(),
  );

const DENSE_INPUT_CLASS = "h-7 text-[13px] px-2 font-mono";
const DENSE_CELL_CLASS = "py-1 px-2 text-[13px] font-mono";

export function QuotationLineRow({
  index,
  line,
  suggestions,
  onCodeChange,
  onPickProduct,
  onQuantityChange,
  onRemove,
  onVatOverride,
  codeInputRef,
  qtyInputRef,
  codeDraft,
}: Props) {
  const tryPick = (): boolean => {
    const exact = findExactProduct(codeDraft, suggestions);
    if (exact) {
      onPickProduct(index, exact);
      return true;
    }
    if (suggestions.length > 0) {
      onPickProduct(index, suggestions[0]);
      return true;
    }
    return false;
  };

  const handleCodeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === "Tab" && !event.shiftKey) || event.key === "Enter") {
      if (tryPick()) {
        event.preventDefault();
      }
    } else if (event.ctrlKey && (event.key === "d" || event.key === "D")) {
      event.preventDefault();
      onRemove(index);
    } else if (
      event.ctrlKey &&
      (event.key === "t" || event.key === "T") &&
      line.kind === "filled"
    ) {
      event.preventDefault();
      onVatOverride(index);
    }
  };

  const handleQtyKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey && (event.key === "d" || event.key === "D")) {
      event.preventDefault();
      onRemove(index);
    } else if (
      event.ctrlKey &&
      (event.key === "t" || event.key === "T") &&
      line.kind === "filled"
    ) {
      event.preventDefault();
      onVatOverride(index);
    }
  };

  if (line.kind === "empty") {
    const hasSuggestions = suggestions.length > 0;
    const hasDraft = codeDraft.trim().length > 0;
    return (
      <TableRow data-testid={`line-row-${index}`}>
        <TableCell className={DENSE_CELL_CLASS}>
          <Input
            ref={codeInputRef}
            value={codeDraft}
            onChange={(e) => onCodeChange(e.target.value)}
            onKeyDown={handleCodeKeyDown}
            placeholder="Code produit (Tab/Entrée valide)"
            aria-label={`Code produit ligne ${index + 1}`}
            data-testid={`line-${index}-code-input`}
            className={DENSE_INPUT_CLASS}
          />
        </TableCell>
        <TableCell className="px-2 py-1 align-top text-[13px]">
          {hasSuggestions ? (
            <div className="flex flex-col gap-1">
              <span
                className="text-muted-foreground font-mono text-[11px]"
                data-testid={`line-${index}-suggestion`}
              >
                {suggestions.length} suggestion
                {suggestions.length > 1 ? "s" : ""} — ↹ Tab / Entrée valide la
                1ère
              </span>
              <ul
                className="bg-popover border-primary/40 max-h-72 overflow-y-auto rounded-md border-2 font-mono text-[13px] shadow-xl"
                data-testid={`line-${index}-suggestions-list`}
              >
                {suggestions.slice(0, 6).map((product, suggestionIdx) => (
                  <li key={String(product.id)}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onPickProduct(index, product);
                      }}
                      className={
                        suggestionIdx === 0
                          ? "bg-muted/60 hover:bg-muted block w-full px-3 py-2 text-left"
                          : "hover:bg-muted block w-full px-3 py-2 text-left"
                      }
                      data-testid={`line-${index}-suggestion-item-${product.code}`}
                    >
                      <span className="font-mono font-semibold">
                        {product.code}
                      </span>
                      <span className="text-muted-foreground"> — </span>
                      <span>{product.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : hasDraft ? (
            <span
              className="text-muted-foreground text-[11px]"
              data-testid={`line-${index}-hint-nomatch`}
            >
              Aucun produit pour « {codeDraft} »
            </span>
          ) : (
            <span
              className="text-muted-foreground text-[11px]"
              data-testid={`line-${index}-hint-empty`}
            >
              Tapez 2 lettres puis Tab/Entrée — ou cliquez la suggestion
            </span>
          )}
        </TableCell>
        <TableCell className={`${DENSE_CELL_CLASS} text-right`}>—</TableCell>
        <TableCell className={`${DENSE_CELL_CLASS} text-right`}>—</TableCell>
        <TableCell className={`${DENSE_CELL_CLASS} text-right`}>—</TableCell>
        <TableCell className={`${DENSE_CELL_CLASS} w-8`} />
      </TableRow>
    );
  }

  return (
    <TableRow data-testid={`line-row-${index}`}>
      <TableCell className={DENSE_CELL_CLASS}>
        <Input
          ref={codeInputRef}
          value={line.product_code}
          readOnly
          onKeyDown={handleCodeKeyDown}
          aria-label={`Code produit ligne ${index + 1}`}
          data-testid={`line-${index}-code-readonly`}
          className={DENSE_INPUT_CLASS}
        />
      </TableCell>
      <TableCell className="px-2 py-1 text-[13px]">
        {line.product_name}
      </TableCell>
      <TableCell className={`${DENSE_CELL_CLASS} text-right`}>
        <Input
          ref={qtyInputRef}
          type="number"
          min={0}
          step="any"
          value={line.quantity}
          onChange={(e) =>
            onQuantityChange(index, Number.parseFloat(e.target.value) || 0)
          }
          onKeyDown={handleQtyKeyDown}
          aria-label={`Quantité ligne ${index + 1}`}
          data-testid={`line-${index}-qty-input`}
          className={`${DENSE_INPUT_CLASS} w-20 text-right`}
        />
      </TableCell>
      <TableCell className={`${DENSE_CELL_CLASS} text-right`}>
        {formatEUR(line.unit_price_ht)}
      </TableCell>
      <TableCell
        className={`${DENSE_CELL_CLASS} text-right`}
        data-testid={`line-${index}-total`}
      >
        {formatEUR(line.line_total_ht)} ·{" "}
        <span className="text-muted-foreground">
          {formatQuantity(line.vat_rate)}%
        </span>
      </TableCell>
      <TableCell className={`${DENSE_CELL_CLASS} w-8`}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          aria-label={`Supprimer ligne ${index + 1}`}
          title="Supprimer (Ctrl+D)"
          data-testid={`line-${index}-remove`}
          className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
