import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const DEBOUNCE_MS = 80;

type Props = {
  onQueryChange: (query: string) => void;
  autoFocus?: boolean;
};

export function ProductsSearchInput({ onQueryChange, autoFocus }: Props) {
  const [value, setValue] = useState("");
  const debounced = useDebouncedValue(value, DEBOUNCE_MS);
  const onQueryChangeRef = useRef(onQueryChange);

  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  });

  useEffect(() => {
    onQueryChangeRef.current(debounced);
  }, [debounced]);

  return (
    <Input
      type="search"
      placeholder="Rechercher (code, nom, catégorie)…"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      autoFocus={autoFocus}
      data-testid="products-search-input"
      className="max-w-md"
    />
  );
}
