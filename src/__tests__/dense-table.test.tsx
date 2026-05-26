import { describe, expect, test } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DenseTable } from "@/components/heritage/dense-table";

const rows = [
  { id: "1", cells: ["D26-0142", "BISTROT DU PORT", "450,00", "Envoyé"] },
  { id: "2", cells: ["D26-0143", "HOTEL CAMPO", "1230,50", "Brouillon"] },
];
const headers = ["N°", "Client", "Total HT", "Statut"];

describe("DenseTable", () => {
  test("renders headers and rows", () => {
    render(<DenseTable headers={headers} rows={rows} />);
    expect(screen.getByText("N°")).toBeInTheDocument();
    expect(screen.getByText("BISTROT DU PORT")).toBeInTheDocument();
  });

  test("ArrowDown then Enter activates second row", () => {
    let activated: string | null = null;
    render(
      <DenseTable
        headers={headers}
        rows={rows}
        onActivate={(row) => (activated = row.id)}
      />,
    );
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(activated).toBe("2");
  });
});
