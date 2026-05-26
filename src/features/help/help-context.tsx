import * as React from "react";
import type { ShortcutEntry } from "./shortcuts-catalog";

type HelpContextValue = {
  entries: readonly ShortcutEntry[];
  register: (entries: readonly ShortcutEntry[]) => () => void;
};

const HelpContext = React.createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = React.useState<ShortcutEntry[]>([]);

  const register = React.useCallback((next: readonly ShortcutEntry[]) => {
    setEntries((current) => [...current, ...next]);
    return () => {
      setEntries((current) =>
        current.filter((e) => !next.some((n) => n.id === e.id)),
      );
    };
  }, []);

  const value = React.useMemo<HelpContextValue>(
    () => ({ entries, register }),
    [entries, register],
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp(): HelpContextValue {
  const ctx = React.useContext(HelpContext);
  if (!ctx) {
    return { entries: [], register: () => () => undefined };
  }
  return ctx;
}

export function useRegisterHelpEntries(
  entries: readonly ShortcutEntry[],
): void {
  const { register } = useHelp();
  React.useEffect(() => {
    return register(entries);
  }, [entries, register]);
}
