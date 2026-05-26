import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────
// Shell — bordered container with fixed max-height + internal scroll
// ──────────────────────────────────────────────────────────────────

export function DrillDownShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-primary/20 bg-card flex max-h-[70vh] flex-col overflow-hidden rounded-md border-2 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Search input
// ──────────────────────────────────────────────────────────────────

export function DrillDownSearch({
  value,
  onChange,
  placeholder = "Filtrer par nom, code…",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="border-border/40 flex items-center gap-2 border-b px-3 py-2">
      <Search className="text-muted-foreground h-3.5 w-3.5" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 border-0 bg-transparent px-0 font-mono text-[12px] shadow-none focus-visible:ring-0"
        autoFocus
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Table with sticky header
// ──────────────────────────────────────────────────────────────────

export type DrillDownColumn<T> = {
  key: string;
  label: ReactNode;
  align?: "left" | "right";
  width?: string;
  render: (row: T) => ReactNode;
};

export function DrillDownTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = "Aucun résultat.",
  gridTemplate,
}: {
  columns: DrillDownColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  gridTemplate: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground p-6 text-center text-[13px]">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className="bg-card text-muted-foreground sticky top-0 z-10 grid gap-x-3 border-b px-3 py-1 text-[10px] font-medium tracking-wide uppercase"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={col.align === "right" ? "text-right" : ""}
          >
            {col.label}
          </div>
        ))}
      </div>
      {rows.map((row) => {
        const Wrapper: "button" | "div" = onRowClick ? "button" : "div";
        return (
          <Wrapper
            key={rowKey(row)}
            type={onRowClick ? "button" : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "border-border/40 grid w-full gap-x-3 border-t px-3 py-1 text-left font-mono text-[12px]",
              onRowClick && "hover:bg-muted/50 cursor-pointer",
            )}
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className={cn(
                  "self-center",
                  col.align === "right" && "text-right tabular-nums",
                )}
              >
                {col.render(row)}
              </div>
            ))}
          </Wrapper>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Pagination + Footer (single bar at the bottom of the shell)
// ──────────────────────────────────────────────────────────────────

export function DrillDownFooter({
  shown,
  total,
  hasMore,
  onLoadMore,
}: {
  shown: number;
  total: number;
  hasMore: boolean;
  onLoadMore?: () => void;
}) {
  return (
    <div className="border-border/40 bg-card flex items-center justify-between gap-3 border-t px-3 py-2 text-[11px]">
      <div className="text-muted-foreground">
        {shown} affichés / {total} total · Esc pour fermer
      </div>
      {hasMore && onLoadMore ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[11px]"
          onClick={onLoadMore}
        >
          Voir 50 suivants
        </Button>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// usePaginatedList — pagination + client-side search hook
// ──────────────────────────────────────────────────────────────────

export function usePaginatedList<T>({
  rows,
  searchKeys,
  initialPageSize = 50,
  pageStep = 50,
}: {
  rows: readonly T[];
  searchKeys?: (keyof T)[];
  initialPageSize?: number;
  pageStep?: number;
}) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed || !searchKeys || searchKeys.length === 0) return [...rows];
    return rows.filter((row) =>
      searchKeys.some((key) => {
        const value = row[key];
        return typeof value === "string"
          ? value.toLowerCase().includes(trimmed)
          : false;
      }),
    );
  }, [rows, search, searchKeys]);

  const visible = useMemo(
    () => filtered.slice(0, pageSize),
    [filtered, pageSize],
  );

  return {
    search,
    setSearch,
    visible,
    total: filtered.length,
    hasMore: filtered.length > visible.length,
    loadMore: () => setPageSize((p) => p + pageStep),
    reset: () => setPageSize(initialPageSize),
  };
}
