import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ContextualSearchOverlay } from "@/features/search/contextual-search-overlay";
import { useQuery } from "convex/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

const sampleResults = {
  clients: [
    {
      id: "c1",
      code: "C001",
      name: "Bar du Port",
      city: "Nice",
    },
  ],
  products: [
    {
      id: "p1",
      code: "CAF-001",
      name: "Café Toscano",
      price_ht: 24.5,
      vat_rate: 20,
      stock_qty: 10,
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(useQuery).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

const typeAndFlushDebounce = (value: string) => {
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value } });
  act(() => {
    vi.advanceTimersByTime(120);
  });
};

describe("ContextualSearchOverlay", () => {
  test("mode=clients only shows clients bucket", () => {
    vi.mocked(useQuery).mockReturnValue({
      clients: sampleResults.clients,
      products: [],
    } as never);
    render(<ContextualSearchOverlay mode="clients" onClose={vi.fn()} />);
    typeAndFlushDebounce("bar");
    expect(screen.getByText(/^Clients/)).toBeInTheDocument();
    expect(screen.queryByText(/^Produits/)).not.toBeInTheDocument();
    expect(screen.getByText("Bar du Port")).toBeInTheDocument();
  });

  test("mode=products only shows products bucket", () => {
    vi.mocked(useQuery).mockReturnValue({
      clients: [],
      products: sampleResults.products,
    } as never);
    render(<ContextualSearchOverlay mode="products" onClose={vi.fn()} />);
    typeAndFlushDebounce("caf");
    expect(screen.getByText(/^Produits/)).toBeInTheDocument();
    expect(screen.queryByText(/^Clients/)).not.toBeInTheDocument();
    expect(screen.getByText("Café Toscano")).toBeInTheDocument();
  });

  test("mode=palette (global) shows both buckets with separator", () => {
    vi.mocked(useQuery).mockReturnValue({
      clients: sampleResults.clients,
      products: sampleResults.products,
    } as never);
    render(<ContextualSearchOverlay mode="palette" onClose={vi.fn()} />);
    typeAndFlushDebounce("ba");
    expect(screen.getByText(/^Clients/)).toBeInTheDocument();
    expect(screen.getByText(/^Produits/)).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  test("Enter on selected option selects client by default", () => {
    vi.mocked(useQuery).mockReturnValue({
      clients: sampleResults.clients,
      products: [],
    } as never);
    const onSelectClient = vi.fn();
    render(
      <ContextualSearchOverlay
        mode="clients"
        onClose={vi.fn()}
        onSelectClient={onSelectClient}
      />,
    );
    typeAndFlushDebounce("bar");
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelectClient).toHaveBeenCalledWith(sampleResults.clients[0]);
  });

  test("Escape calls onClose", () => {
    vi.mocked(useQuery).mockReturnValue(undefined as never);
    const onClose = vi.fn();
    render(<ContextualSearchOverlay mode="clients" onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  test("empty query shows hint, no crash", () => {
    vi.mocked(useQuery).mockReturnValue(undefined as never);
    render(<ContextualSearchOverlay mode="clients" onClose={vi.fn()} />);
    expect(screen.getByText("Tapez pour rechercher")).toBeInTheDocument();
  });

  test("no result yields Aucun résultat", () => {
    vi.mocked(useQuery).mockReturnValue({
      clients: [],
      products: [],
    } as never);
    render(<ContextualSearchOverlay mode="clients" onClose={vi.fn()} />);
    typeAndFlushDebounce("zzz");
    expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
  });
});
