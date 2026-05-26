import { fireEvent, render, screen } from "@testing-library/react";
import { useNavigate } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CommandPalette } from "@/features/search/command-palette";
import { authClient } from "@/lib/auth-client";

const navigate = vi.fn();

beforeEach(() => {
  navigate.mockReset();
  vi.mocked(useNavigate).mockReturnValue(
    navigate as unknown as ReturnType<typeof useNavigate>,
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

const getInput = (): HTMLInputElement =>
  screen.getByRole("combobox") as HTMLInputElement;

describe("CommandPalette", () => {
  test("renders the 13 commands by default", () => {
    render(<CommandPalette onClose={vi.fn()} />);
    expect(screen.getAllByRole("option")).toHaveLength(13);
    expect(screen.getByText("Nouveau devis")).toBeInTheDocument();
    expect(screen.getByText("Nouveau BL direct")).toBeInTheDocument();
    expect(screen.getByText("Nouvelle facture (agrégée)")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.getByText("Tableau de bord BI")).toBeInTheDocument();
    expect(screen.getByText("Tickets SAV")).toBeInTheDocument();
    expect(screen.getByText("Nouveau ticket SAV")).toBeInTheDocument();
    expect(screen.getByText("Se déconnecter")).toBeInTheDocument();
  });

  test("typing filters commands by tokens", () => {
    render(<CommandPalette onClose={vi.fn()} />);
    fireEvent.change(getInput(), { target: { value: "dev" } });
    const visible = screen.getAllByRole("option").map((el) => el.textContent);
    const joined = visible.join("|");
    expect(joined).toContain("Nouveau devis");
    expect(joined).toContain("Liste devis");
    expect(joined).not.toContain("Liste factures");
  });

  test("Enter on a navigation command calls navigate({to})", () => {
    const onClose = vi.fn();
    render(<CommandPalette onClose={onClose} />);
    const input = getInput();
    // cmdk pre-selects the first matching item — "new-quotation" → "/app/quotations/new"
    fireEvent.keyDown(input, { key: "Enter" });
    expect(navigate).toHaveBeenCalledWith({ to: "/app/quotations/new" });
    expect(onClose).toHaveBeenCalled();
  });

  test("Enter on sign-out calls authClient.signOut then navigates to /auth/signin", async () => {
    const onClose = vi.fn();
    const signOut = vi.mocked(authClient.signOut);
    signOut.mockResolvedValue({ data: null, error: null } as never);
    render(<CommandPalette onClose={onClose} />);
    const input = getInput();

    // Navigate to last option (sign-out). 13 items, start at idx 0 → 12 down presses.
    for (let i = 0; i < 12; i++) {
      fireEvent.keyDown(input, { key: "ArrowDown" });
    }
    fireEvent.keyDown(input, { key: "Enter" });
    // wait for async signOut → navigate chain
    await Promise.resolve();
    await Promise.resolve();
    expect(signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: "/auth/signin" });
    expect(onClose).toHaveBeenCalled();
  });

  test("ArrowDown moves selection (aria-selected)", () => {
    render(<CommandPalette onClose={vi.fn()} />);
    const input = getInput();
    const options = screen.getAllByRole("option");
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");
  });

  test("Escape calls onClose", () => {
    const onClose = vi.fn();
    render(<CommandPalette onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  test("Aucune commande when query has no match", () => {
    render(<CommandPalette onClose={vi.fn()} />);
    fireEvent.change(getInput(), { target: { value: "zzz-no-match" } });
    expect(screen.getByText("Aucune commande")).toBeInTheDocument();
  });
});
