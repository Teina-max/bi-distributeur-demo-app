import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { HelpOverlay } from "@/features/help/help-overlay";

describe("HelpOverlay", () => {
  test("renders the static shortcuts catalog (≥8 rows)", () => {
    render(<HelpOverlay onClose={vi.fn()} />);
    const rows = screen.getAllByRole("row");
    // 1 header + ≥8 entries = ≥9 rows total
    expect(rows.length).toBeGreaterThanOrEqual(9);
    expect(screen.getByText("Aide — raccourcis clavier")).toBeInTheDocument();
  });

  test("displays F1, F2, F3, Ctrl+K and Echap entries", () => {
    render(<HelpOverlay onClose={vi.fn()} />);
    expect(screen.getByText("F1")).toBeInTheDocument();
    expect(screen.getByText("F2")).toBeInTheDocument();
    expect(screen.getByText("F3")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+K")).toBeInTheDocument();
    expect(screen.getByText("Echap")).toBeInTheDocument();
  });

  test("Escape calls onClose", () => {
    const onClose = vi.fn();
    render(<HelpOverlay onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  test("F1 closes the help overlay (toggle)", () => {
    const onClose = vi.fn();
    render(<HelpOverlay onClose={onClose} />);
    fireEvent.keyDown(window, { key: "F1" });
    expect(onClose).toHaveBeenCalled();
  });
});
