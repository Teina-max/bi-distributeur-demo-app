import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export type PickedClient = {
  id: Id<"clients">;
  code: string;
  name: string;
  city: string;
};

type Props = {
  selected: PickedClient | null;
  onPickClient: (client: PickedClient) => void;
  onClear: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
};

const MIN_QUERY = 3;

export function ClientPicker({
  selected,
  onPickClient,
  onClear,
  inputRef,
}: Props) {
  const [draftQuery, setDraftQuery] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const debounced = useDebouncedValue(draftQuery, 80);

  const trimmed = debounced.trim();
  const enabled = trimmed.length >= MIN_QUERY && selected === null;

  const suggestions =
    useQuery(
      api.quotations.queries.listClientSuggestions,
      enabled ? { query: trimmed } : "skip",
    ) ?? [];

  const displayValue = selected
    ? `${selected.code} - ${selected.name}`
    : draftQuery;

  const pick = (item: PickedClient) => {
    onPickClient(item);
    setDraftQuery("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (selected !== null && event.key === "Backspace") {
      event.preventDefault();
      onClear();
      return;
    }
    if (event.key === "Enter" && suggestions.length > 0) {
      event.preventDefault();
      pick(suggestions[0]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="client-picker-input" className="text-xs">
        Client
      </Label>
      <div className="relative">
        <Input
          id="client-picker-input"
          ref={inputRef}
          value={displayValue}
          autoFocus
          readOnly={selected !== null}
          onChange={(e) => setDraftQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Tapez 3 lettres + Entrée (Retour arrière pour effacer)"
          data-testid="aggregate-client-picker-input"
          className="font-mono"
        />
        {focused && enabled && suggestions.length > 0 ? (
          <ul
            className="bg-popover ring-foreground/10 absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-md font-mono text-[12px] shadow-md ring-1"
            data-testid="aggregate-client-suggestions"
          >
            {suggestions.slice(0, 5).map((c) => (
              <li
                key={c.id}
                className="hover:bg-muted cursor-pointer px-3 py-1.5"
                data-testid={`aggregate-client-suggestion-${c.id}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(c);
                }}
              >
                {c.code} — {c.name}
                <span className="text-muted-foreground"> · {c.city}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
