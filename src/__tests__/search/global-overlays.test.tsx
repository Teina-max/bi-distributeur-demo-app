import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GlobalOverlays } from "@/features/search/global-overlays";

vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue(undefined),
}));

beforeEach(() => {
  // ensure window keydown listeners get a clean slate; rendering re-attaches
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GlobalOverlays", () => {
  test("renders nothing initially", () => {
    const { container } = render(<GlobalOverlays />);
    expect(container).toBeEmptyDOMElement();
  });

  test("Ctrl+K opens the command palette", () => {
    render(<GlobalOverlays />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByText("Palette de commandes")).toBeInTheDocument();
  });

  test("F1 opens the help overlay", () => {
    render(<GlobalOverlays />);
    fireEvent.keyDown(window, { key: "F1" });
    expect(screen.getByText("Aide — raccourcis clavier")).toBeInTheDocument();
  });

  test("Escape closes an open overlay", () => {
    render(<GlobalOverlays />);
    fireEvent.keyDown(window, { key: "F1" });
    expect(screen.getByText("Aide — raccourcis clavier")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByText("Aide — raccourcis clavier"),
    ).not.toBeInTheDocument();
  });

  test("F3 on no specific route opens palette (global mode)", () => {
    render(<GlobalOverlays />);
    fireEvent.keyDown(window, { key: "F3" });
    // Either contextual search or palette; in default '/' pathname,
    // resolveContextualMode returns "palette".
    expect(screen.getByText("Palette de commandes")).toBeInTheDocument();
  });
});
