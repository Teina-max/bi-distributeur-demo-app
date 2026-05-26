import { act, renderHook } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, test } from "vitest";
import {
  HelpProvider,
  useHelp,
  useRegisterHelpEntries,
} from "@/features/help/help-context";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <HelpProvider>{children}</HelpProvider>
);

describe("HelpProvider + useHelp", () => {
  test("defaults to empty entries when no provider", () => {
    const { result } = renderHook(() => useHelp());
    expect(result.current.entries).toEqual([]);
  });

  test("register adds entries and returns cleanup that removes them", () => {
    const { result } = renderHook(() => useHelp(), { wrapper });
    let cleanup: () => void = () => undefined;
    act(() => {
      cleanup = result.current.register([
        { id: "x", shortcut: "X", action: "Test", scope: "Test" },
      ]);
    });
    expect(result.current.entries).toHaveLength(1);
    act(() => {
      cleanup();
    });
    expect(result.current.entries).toHaveLength(0);
  });

  test("useRegisterHelpEntries registers on mount", () => {
    const ENTRIES = [
      { id: "mounted", shortcut: "M", action: "X", scope: "Test" },
    ];
    const { result } = renderHook(
      () => {
        useRegisterHelpEntries(ENTRIES);
        return useHelp();
      },
      { wrapper },
    );
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]?.id).toBe("mounted");
  });
});
