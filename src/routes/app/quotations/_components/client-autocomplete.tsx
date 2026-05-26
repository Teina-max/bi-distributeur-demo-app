import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { ClientSuggestion } from "@/features/quotations/types";

type Props = {
  selected: { id: string; code: string; name: string } | null;
  onPickClient: (client: ClientSuggestion) => void;
  inputRef?: React.Ref<HTMLInputElement>;
};

const MIN_QUERY = 2;

export function ClientAutocomplete({
  selected,
  onPickClient,
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

  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const [overlayQuery, setOverlayQuery] = React.useState("");
  const debounced = useDebouncedValue(draftQuery, 80);
  const overlayDebounced = useDebouncedValue(overlayQuery, 80);

  const trimmed = debounced.trim();
  const enabled = trimmed.length >= MIN_QUERY && selected === null;

  const suggestions =
    useQuery(
      api.quotations.queries.listClientSuggestions,
      enabled ? { query: trimmed } : "skip",
    ) ?? [];

  const overlayTrimmed = overlayDebounced.trim();
  const overlayEnabled = overlayOpen && overlayTrimmed.length >= MIN_QUERY;
  const overlaySuggestions =
    useQuery(
      api.quotations.queries.listClientSuggestions,
      overlayEnabled ? { query: overlayTrimmed } : "skip",
    ) ?? [];

  const pick = (item: ClientSuggestion) => {
    onPickClient(item);
    setOverlayOpen(false);
    setOverlayQuery("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && suggestions.length > 0) {
      event.preventDefault();
      pick(suggestions[0]);
    } else if (event.key === "F3") {
      event.preventDefault();
      setOverlayOpen(true);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="client-input" className="text-xs">
        Client
      </Label>
      <div className="relative">
        <Input
          id="client-input"
          ref={inputRef}
          value={displayValue}
          autoFocus
          readOnly={selected !== null}
          onChange={(e) => setDraftQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tapez 2 lettres + Entrée — F3 pour la liste plein écran"
          data-testid="client-autocomplete-input"
          className="font-mono"
        />
        {enabled && suggestions.length > 0 ? (
          <ul
            className="bg-popover ring-foreground/10 absolute top-full right-0 left-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-md font-mono text-[12px] shadow-md ring-1"
            data-testid="client-suggestions-inline"
          >
            {suggestions.slice(0, 5).map((c) => (
              <li
                key={c.id}
                className="hover:bg-muted cursor-pointer px-3 py-1.5"
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
      <CommandDialog
        open={overlayOpen}
        onOpenChange={setOverlayOpen}
        title="Sélection client"
        description="Tapez 3 lettres puis Entrée. Echap pour fermer."
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={overlayQuery}
            onValueChange={setOverlayQuery}
            placeholder="Code, nom ou ville (2 lettres min)…"
            data-testid="client-overlay-input"
          />
          <CommandList>
            {overlayEnabled && overlaySuggestions.length === 0 ? (
              <CommandEmpty>Aucun client correspondant.</CommandEmpty>
            ) : null}
            {!overlayEnabled ? (
              <CommandEmpty>Tapez au moins 2 caractères.</CommandEmpty>
            ) : null}
            <CommandGroup>
              {overlaySuggestions.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => pick(c)}
                  className="font-mono"
                  data-testid={`client-overlay-item-${c.id}`}
                >
                  <span>
                    {c.code} — {c.name}
                  </span>
                  <span className="text-muted-foreground ml-auto">
                    {c.city}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
