import { describe, expect, test } from "vitest";
import {
  SHORTCUTS_CATALOG,
  type ShortcutEntry,
} from "@/features/help/shortcuts-catalog";

describe("SHORTCUTS_CATALOG", () => {
  test("contains at least 8 entries (POC fallback)", () => {
    expect(SHORTCUTS_CATALOG.length).toBeGreaterThanOrEqual(8);
  });

  test("each entry has shortcut, action, and scope", () => {
    SHORTCUTS_CATALOG.forEach((entry: ShortcutEntry) => {
      expect(entry.shortcut.length).toBeGreaterThan(0);
      expect(entry.action.length).toBeGreaterThan(0);
      expect(entry.scope.length).toBeGreaterThan(0);
    });
  });

  test("F1, F2, F3, Ctrl+K, Escape are present", () => {
    const shortcuts = SHORTCUTS_CATALOG.map((e) => e.shortcut);
    expect(shortcuts).toContain("F1");
    expect(shortcuts).toContain("F2");
    expect(shortcuts).toContain("F3");
    expect(shortcuts).toContain("Ctrl+K");
    expect(shortcuts).toContain("Echap");
  });

  test("ids are unique", () => {
    const ids = SHORTCUTS_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
