import { describe, expect, test, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";
import type { StockMovementDto } from "@convex/stock_movements/dto/stockMovement";
import { ProductStockMovementsTable } from "@/routes/app/products/_components/product-stock-movements-table";
import { setup } from "@/test/setup";

const id = (s: string) => s as unknown as Id<"stock_movements">;
const productId = "prod_001" as unknown as Id<"products">;
const deliveryFormId = "df_001" as unknown as Id<"delivery_forms">;
const purchaseOrderId = "po_001" as unknown as Id<"purchase_orders">;

const baseMovement = (
  override: Partial<StockMovementDto> = {},
): StockMovementDto => ({
  id: id("sm_001"),
  productId,
  productCode: "CAF-001-1KG",
  productName: "Café Toscano Classico 1kg",
  delta: 10,
  reason: "purchase_order_in",
  referenceKind: "purchase_order",
  referenceId: purchaseOrderId,
  note: null,
  createdAt: 1747500000000,
  ...override,
});

describe("ProductStockMovementsTable", () => {
  test("renders empty state message when no movements", () => {
    setup(<ProductStockMovementsTable movements={[]} />);
    expect(screen.getByText("Aucun mouvement enregistré.")).toBeInTheDocument();
  });

  test("renders positive delta with leading +", () => {
    setup(
      <ProductStockMovementsTable movements={[baseMovement({ delta: 10 })]} />,
    );
    const row = screen.getByTestId("stock-movement-row-sm_001");
    expect(row).toHaveTextContent("+10");
    const deltaCell = row.querySelectorAll("td")[1];
    expect(deltaCell.className).not.toContain("text-destructive");
  });

  test("renders negative delta in destructive color", () => {
    setup(
      <ProductStockMovementsTable
        movements={[
          baseMovement({
            id: id("sm_002"),
            delta: -5,
            reason: "delivery_form_out",
            referenceKind: "delivery_form",
            referenceId: deliveryFormId,
          }),
        ]}
      />,
    );
    const row = screen.getByTestId("stock-movement-row-sm_002");
    const deltaCell = row.querySelectorAll("td")[1];
    expect(deltaCell.textContent).toBe("-5");
    expect(deltaCell.className).toContain("text-destructive");
  });

  test("renders em-dash when referenceId is null", () => {
    setup(
      <ProductStockMovementsTable
        movements={[
          baseMovement({
            id: id("sm_003"),
            reason: "manual_adjustment",
            referenceKind: "manual",
            referenceId: null,
          }),
        ]}
      />,
    );
    const row = screen.getByTestId("stock-movement-row-sm_003");
    expect(
      row.querySelector('[data-testid="stock-movement-ref-sm_003"]'),
    ).toBeNull();
    expect(row).toHaveTextContent("—");
  });

  test("renders em-dash when note is null", () => {
    setup(
      <ProductStockMovementsTable movements={[baseMovement({ note: null })]} />,
    );
    const row = screen.getByTestId("stock-movement-row-sm_001");
    const noteCell = row.querySelectorAll("td")[4];
    expect(noteCell.textContent).toBe("—");
  });

  test("delivery_form reference click navigates to BL detail", () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);
    setup(
      <ProductStockMovementsTable
        movements={[
          baseMovement({
            id: id("sm_004"),
            delta: -3,
            reason: "delivery_form_out",
            referenceKind: "delivery_form",
            referenceId: deliveryFormId,
          }),
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId("stock-movement-ref-sm_004"));
    expect(navigate).toHaveBeenCalledWith({
      to: "/app/delivery-forms/$deliveryFormId",
      params: { deliveryFormId: "df_001" },
    });
  });

  test("purchase_order reference click shows toast (BC L5 pending)", () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);
    setup(
      <ProductStockMovementsTable
        movements={[
          baseMovement({
            id: id("sm_005"),
            reason: "purchase_order_in",
            referenceKind: "purchase_order",
            referenceId: purchaseOrderId,
          }),
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId("stock-movement-ref-sm_005"));
    expect(navigate).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith(
      "Page BC fournisseurs à venir (Lot L5).",
    );
  });

  test("renders reason labels in French", () => {
    setup(
      <ProductStockMovementsTable
        movements={[
          baseMovement({ id: id("sm_a"), reason: "delivery_form_out" }),
          baseMovement({ id: id("sm_b"), reason: "purchase_order_in" }),
          baseMovement({ id: id("sm_c"), reason: "manual_adjustment" }),
        ]}
      />,
    );
    expect(screen.getByText("Sortie BL")).toBeInTheDocument();
    expect(screen.getByText("Entrée BC")).toBeInTheDocument();
    expect(screen.getByText("Ajustement")).toBeInTheDocument();
  });
});
