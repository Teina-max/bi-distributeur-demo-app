import * as React from "react";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";

type RowProps = {
  "data-active": boolean;
  "aria-selected": boolean;
  tabIndex: number;
};

type Options<T> = {
  scopeId: string;
  onActivate?: (row: T, index: number) => void;
  enabled?: boolean;
};

export function useTableKeyboardNav<T extends { id: string }>(
  rows: readonly T[],
  options: Options<T>,
): {
  activeIndex: number;
  getRowProps: (index: number) => RowProps;
} {
  const enabled = options.enabled !== false;
  const [activeIndex, setActiveIndex] = React.useState(0);
  const lastLengthRef = React.useRef(rows.length);

  React.useEffect(() => {
    if (lastLengthRef.current !== rows.length) {
      setActiveIndex((current) =>
        rows.length === 0 ? 0 : Math.min(current, rows.length - 1),
      );
      lastLengthRef.current = rows.length;
    }
  }, [rows.length]);

  const onActivateRef = React.useRef(options.onActivate);
  React.useEffect(() => {
    onActivateRef.current = options.onActivate;
  });

  useKeyboardScope(options.scopeId, {
    ArrowDown: enabled
      ? () => setActiveIndex((c) => Math.min(c + 1, rows.length - 1))
      : undefined,
    ArrowUp: enabled
      ? () => setActiveIndex((c) => Math.max(c - 1, 0))
      : undefined,
    Enter: enabled
      ? () => {
          if (rows.length === 0 || !onActivateRef.current) return;
          onActivateRef.current(rows[activeIndex], activeIndex);
        }
      : undefined,
  });

  const getRowProps = React.useCallback(
    (index: number): RowProps => ({
      "data-active": enabled && index === activeIndex,
      "aria-selected": enabled && index === activeIndex,
      tabIndex: -1,
    }),
    [activeIndex, enabled],
  );

  return { activeIndex, getRowProps };
}
