import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { SupplierSuggestion } from "@/features/supply/types";

type Props = {
  selected: { id: string; code: string; name: string } | null;
  onPickSupplier: (supplier: SupplierSuggestion) => void;
  inputRef?: React.Ref<HTMLInputElement>;
};

const MIN_QUERY = 2;

export function SupplierAutocomplete({
  selected,
  onPickSupplier,
  inputRef,
}: Props) {
  const selectedKey = selected?.id ?? null;
  const [draftQuery, setDraftQuery] = React.useState("");
  const [trackedKey, setTrackedKey] = React.useState<string | null>(
    selectedKey,
  );

  if (selectedKey !== trackedKey) {
    setTrackedKey(selectedKey);
    setDraftQuery("");
  }

  const displayValue = selected
    ? `${selected.code} - ${selected.name}`
    : draftQuery;

  const debounced = useDebouncedValue(draftQuery, 80);

  const trimmed = debounced.trim();
  const enabled = trimmed.length >= MIN_QUERY && selected === null;

  const suggestions =
    useQuery(
      api.suppliers.queries.listSuggestions,
      enabled ? { query: trimmed } : "skip",
    ) ?? [];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && suggestions.length > 0) {
      event.preventDefault();
      onPickSupplier(suggestions[0]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="supplier-input" className="text-xs">
        Fournisseur
      </Label>
      <div className="relative">
        <Input
          id="supplier-input"
          ref={inputRef}
          value={displayValue}
          autoFocus
          readOnly={selected !== null}
          onChange={(e) => setDraftQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tapez 2 lettres + Entrée"
          data-testid="supplier-autocomplete-input"
          className="font-mono"
        />
        {enabled && suggestions.length > 0 ? (
          <ul
            className="bg-popover ring-foreground/10 absolute top-full right-0 left-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-md font-mono text-[12px] shadow-md ring-1"
            data-testid="supplier-suggestions-inline"
          >
            {suggestions.slice(0, 5).map((s) => (
              <li
                key={s.id}
                className="hover:bg-muted cursor-pointer px-3 py-1.5"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onPickSupplier(s);
                }}
              >
                {s.code} — {s.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
