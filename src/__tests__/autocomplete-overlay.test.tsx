import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AutocompleteOverlay } from "@/components/heritage/autocomplete-overlay";

const items = [
  { id: "1", primary: "C001234", secondary: "BISTROT DU PORT" },
  { id: "2", primary: "C002891", secondary: "BISTROT DU VIEUX PORT" },
];

describe("AutocompleteOverlay", () => {
  test("renders items and highlights first by default", () => {
    render(
      <AutocompleteOverlay
        title="Rechercher client"
        items={items}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const rows = screen.getAllByRole("option");
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute("aria-selected")).toBe("true");
  });

  test("ArrowDown moves highlight", () => {
    render(
      <AutocompleteOverlay
        title="x"
        items={items}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.keyDown(window, { key: "ArrowDown" });
    const rows = screen.getAllByRole("option");
    expect(rows[1].getAttribute("aria-selected")).toBe("true");
  });

  test("Enter calls onSelect with highlighted item", () => {
    let selected: string | null = null;
    render(
      <AutocompleteOverlay
        title="x"
        items={items}
        onSelect={(item) => (selected = item.id)}
        onClose={vi.fn()}
      />,
    );
    fireEvent.keyDown(window, { key: "Enter" });
    expect(selected).toBe("1");
  });

  test("Escape calls onClose", () => {
    let closed = false;
    render(
      <AutocompleteOverlay
        title="x"
        items={items}
        onSelect={vi.fn()}
        onClose={() => (closed = true)}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closed).toBe(true);
  });
});
