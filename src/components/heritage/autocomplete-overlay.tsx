import * as React from "react";

export type AutocompleteItem = {
  id: string;
  primary: string;
  secondary?: string;
};

type Props = {
  title: string;
  items: readonly AutocompleteItem[];
  onSelect: (item: AutocompleteItem) => void;
  onClose: () => void;
};

export function AutocompleteOverlay({
  title,
  items,
  onSelect,
  onClose,
}: Props) {
  const [index, setIndex] = React.useState(0);

  const clampedIndex = items.length > 0 ? Math.min(index, items.length - 1) : 0;

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((current) => Math.min(current + 1, items.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((current) => Math.max(current - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        onSelect(items[clampedIndex]!);
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, clampedIndex, onSelect, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24">
      <div className="border border-[var(--hz-border)] bg-white shadow-md">
        <div className="border-b border-[var(--hz-border)] bg-[var(--hz-bg-toolbar)] px-2 py-1 text-[13px]">
          {title}
        </div>
        <ul role="listbox" className="max-h-80 min-w-[420px] overflow-auto">
          {items.map((item, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={i === clampedIndex}
              className={
                i === clampedIndex
                  ? "hz-row hz-mono bg-[var(--hz-accent)] px-2 text-white"
                  : "hz-row hz-mono px-2"
              }
            >
              <span>{item.primary}</span>
              {item.secondary !== undefined ? (
                <span className="ml-2 font-[var(--hz-font-ui)]">
                  - {item.secondary}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--hz-border)] bg-[var(--hz-bg-toolbar)] px-2 py-1 text-[12px]">
          ↑↓ Naviguer Entrée Sélectionner Echap Fermer
        </div>
      </div>
    </div>
  );
}
