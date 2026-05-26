import { describe, expect, test } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";

function Probe({ onTrigger }: { onTrigger: () => void }) {
  useKeyboardScope("test-scope", { F2: onTrigger });
  return <div data-testid="probe" />;
}

describe("useKeyboardScope", () => {
  test("invokes handler when matching key pressed", () => {
    let count = 0;
    render(<Probe onTrigger={() => (count += 1)} />);
    fireEvent.keyDown(window, { key: "F2" });
    expect(count).toBe(1);
  });

  test("ignores keys not in the scope map", () => {
    let count = 0;
    render(<Probe onTrigger={() => (count += 1)} />);
    fireEvent.keyDown(window, { key: "F5" });
    expect(count).toBe(0);
  });

  test("cleans up listener on unmount", () => {
    let count = 0;
    const { unmount } = render(<Probe onTrigger={() => (count += 1)} />);
    unmount();
    fireEvent.keyDown(window, { key: "F2" });
    expect(count).toBe(0);
  });
});
