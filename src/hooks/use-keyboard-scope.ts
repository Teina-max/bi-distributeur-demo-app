import { useEffect, useLayoutEffect, useRef } from "react";

type KeyMap = Partial<Record<string, () => void>>;

const INPUT_TAGS = new Set(["input", "textarea", "select"]);
const FKEY_PATTERN = /^F\d+$/;

function isFunctionKeyOrEscape(key: string): boolean {
  return key === "Escape" || FKEY_PATTERN.test(key);
}

export function useKeyboardScope(scopeId: string, map: KeyMap): void {
  const mapRef = useRef(map);

  useLayoutEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName.toLowerCase();
        if (INPUT_TAGS.has(tag) && !isFunctionKeyOrEscape(event.key)) {
          return;
        }
      }
      const fn = mapRef.current[event.key];
      if (!fn) return;
      event.preventDefault();
      fn();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scopeId]);
}
