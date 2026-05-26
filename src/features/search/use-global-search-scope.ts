import { useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { OverlayMode } from "./types";

type ScopeApi = {
  mode: OverlayMode;
  open: (mode: Exclude<OverlayMode, "closed">) => void;
  close: () => void;
};

const isClientsRoute = (pathname: string): boolean => {
  return (
    pathname.startsWith("/quotations/new") ||
    /^\/quotations\/[^/]+/.test(pathname)
  );
};

const resolveContextualMode = (
  pathname: string,
): Extract<OverlayMode, "clients" | "products" | "palette"> => {
  if (typeof document !== "undefined") {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      const inProductLine = active.closest('[data-line-context="product"]');
      if (inProductLine) return "products";
    }
  }
  if (isClientsRoute(pathname)) return "clients";
  return "palette";
};

export function useGlobalSearchScope(): ScopeApi {
  const location = useLocation();
  const [mode, setMode] = useState<OverlayMode>("closed");

  const open = useCallback((next: Exclude<OverlayMode, "closed">) => {
    setMode(next);
  }, []);

  const close = useCallback(() => {
    setMode("closed");
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Only act when no overlay is currently open.
      if (mode !== "closed") return;

      if (event.key === "F3") {
        event.preventDefault();
        setMode(resolveContextualMode(location.pathname));
        return;
      }

      if (event.key === "F1") {
        event.preventDefault();
        setMode("help");
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "k" || event.key === "K")
      ) {
        event.preventDefault();
        setMode("palette");
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, location.pathname]);

  return { mode, open, close };
}
