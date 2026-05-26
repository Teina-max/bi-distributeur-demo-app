import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpartanConfirm } from "@/components/heritage/spartan-confirm";

describe("SpartanConfirm", () => {
  test("O key triggers onConfirm", () => {
    let confirmed = false;
    render(
      <SpartanConfirm
        message="Convertir le devis D26-0143 en BL ?"
        onConfirm={() => (confirmed = true)}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.keyDown(window, { key: "o" });
    expect(confirmed).toBe(true);
  });

  test("N key triggers onCancel", () => {
    let cancelled = false;
    render(
      <SpartanConfirm
        message="x"
        onConfirm={vi.fn()}
        onCancel={() => (cancelled = true)}
      />,
    );
    fireEvent.keyDown(window, { key: "n" });
    expect(cancelled).toBe(true);
  });

  test("Escape triggers onCancel", () => {
    let cancelled = false;
    render(
      <SpartanConfirm
        message="x"
        onConfirm={vi.fn()}
        onCancel={() => (cancelled = true)}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(cancelled).toBe(true);
  });

  test("renders the message", () => {
    render(
      <SpartanConfirm
        message="Hello ?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Hello ?")).toBeInTheDocument();
  });
});
