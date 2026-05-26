import { act, renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { useLocation } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useGlobalSearchScope } from "@/features/search/use-global-search-scope";

const setPathname = (pathname: string) => {
  vi.mocked(useLocation).mockReturnValue({ pathname } as ReturnType<
    typeof useLocation
  >);
};

const setActiveLineContext = (mode: "product" | null) => {
  // create a focusable container with the data-attr
  const existing = document.getElementById("line-context-host");
  if (existing) existing.remove();
  if (mode === null) {
    document.body.focus();
    return;
  }
  const div = document.createElement("div");
  div.id = "line-context-host";
  div.setAttribute("data-line-context", mode);
  const input = document.createElement("input");
  input.id = "line-input";
  div.appendChild(input);
  document.body.appendChild(div);
  input.focus();
};

describe("useGlobalSearchScope", () => {
  beforeEach(() => {
    setPathname("/");
  });

  afterEach(() => {
    setActiveLineContext(null);
    const existing = document.getElementById("line-context-host");
    if (existing) existing.remove();
  });

  test("starts closed", () => {
    const { result } = renderHook(() => useGlobalSearchScope());
    expect(result.current.mode).toBe("closed");
  });

  test("F3 on /quotations/new opens clients mode", () => {
    setPathname("/quotations/new");
    const { result } = renderHook(() => useGlobalSearchScope());
    act(() => {
      fireEvent.keyDown(window, { key: "F3" });
    });
    expect(result.current.mode).toBe("clients");
  });

  test("F3 inside data-line-context=product opens products mode", () => {
    setPathname("/quotations/new");
    setActiveLineContext("product");
    const { result } = renderHook(() => useGlobalSearchScope());
    act(() => {
      fireEvent.keyDown(window, { key: "F3" });
    });
    expect(result.current.mode).toBe("products");
  });

  test("F3 elsewhere opens palette (global)", () => {
    setPathname("/dashboard");
    const { result } = renderHook(() => useGlobalSearchScope());
    act(() => {
      fireEvent.keyDown(window, { key: "F3" });
    });
    expect(result.current.mode).toBe("palette");
  });

  test("Ctrl+K opens palette anywhere", () => {
    setPathname("/quotations/new");
    const { result } = renderHook(() => useGlobalSearchScope());
    act(() => {
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    });
    expect(result.current.mode).toBe("palette");
  });

  test("Meta+K (Cmd) also opens palette", () => {
    const { result } = renderHook(() => useGlobalSearchScope());
    act(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
    });
    expect(result.current.mode).toBe("palette");
  });

  test("F1 opens help", () => {
    const { result } = renderHook(() => useGlobalSearchScope());
    act(() => {
      fireEvent.keyDown(window, { key: "F1" });
    });
    expect(result.current.mode).toBe("help");
  });

  test("close() returns to closed", () => {
    const { result } = renderHook(() => useGlobalSearchScope());
    act(() => {
      fireEvent.keyDown(window, { key: "F1" });
    });
    expect(result.current.mode).toBe("help");
    act(() => {
      result.current.close();
    });
    expect(result.current.mode).toBe("closed");
  });

  test("when an overlay is open, subsequent F-keys are ignored", () => {
    const { result } = renderHook(() => useGlobalSearchScope());
    act(() => {
      fireEvent.keyDown(window, { key: "F1" });
    });
    expect(result.current.mode).toBe("help");
    act(() => {
      fireEvent.keyDown(window, { key: "F3" });
    });
    expect(result.current.mode).toBe("help");
    act(() => {
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    });
    expect(result.current.mode).toBe("help");
  });
});
