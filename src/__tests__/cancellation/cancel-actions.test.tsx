import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import { CancelDeliveryFormAction } from "@/features/cancellation/cancel-delivery-form-action";
import { CancelInvoiceAction } from "@/features/cancellation/cancel-invoice-action";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { setup } from "@/test/setup";

const DELIVERY_FORM_ID = "df_cancel_ui" as unknown as Id<"delivery_forms">;
const INVOICE_ID = "inv_cancel_ui" as unknown as Id<"invoices">;
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("@/features/dialog-manager/dialog-manager", () => ({
  dialogManager: {
    custom: vi.fn(),
    confirm: vi.fn(),
    input: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(),
  },
}));

beforeEach(() => {
  mockUseMutation.mockReset();
  vi.mocked(dialogManager.input).mockClear();
});

describe("CancelDeliveryFormAction", () => {
  test("renders for delivered delivery forms", () => {
    mockUseMutation.mockReturnValue(vi.fn());

    setup(
      <CancelDeliveryFormAction
        sourceId={DELIVERY_FORM_ID}
        sourceNumber="B26-0042"
        status="delivered"
      />,
    );

    expect(
      screen.getByRole("button", { name: /annuler ce bl/i }),
    ).toBeInTheDocument();
  });

  test("does not render for invoiced delivery forms", () => {
    mockUseMutation.mockReturnValue(vi.fn());

    setup(
      <CancelDeliveryFormAction
        sourceId={DELIVERY_FORM_ID}
        sourceNumber="B26-0042"
        status="invoiced"
      />,
    );

    expect(
      screen.queryByRole("button", { name: /annuler ce bl/i }),
    ).not.toBeInTheDocument();
  });

  test("opens input dialog and calls mutation with reason", async () => {
    const cancel = vi.fn().mockResolvedValue({
      id: DELIVERY_FORM_ID,
      restoredMovements: 1,
    });
    mockUseMutation.mockReturnValue(cancel);
    const { user } = setup(
      <CancelDeliveryFormAction
        sourceId={DELIVERY_FORM_ID}
        sourceNumber="B26-0042"
        status="delivered"
      />,
    );

    await user.click(screen.getByRole("button", { name: /annuler ce bl/i }));

    expect(dialogManager.input).toHaveBeenCalledTimes(1);
    const config = vi.mocked(dialogManager.input).mock.calls[0][0];
    expect(config.title).toBe("Annuler le BL B26-0042 ?");
    await config.action.onClick("Retour client");

    expect(cancel).toHaveBeenCalledWith({
      id: DELIVERY_FORM_ID,
      reason: "Retour client",
    });
  });
});

describe("CancelInvoiceAction", () => {
  test("renders for sent invoices and opens input dialog", async () => {
    mockUseMutation.mockReturnValue(vi.fn());
    const { user } = setup(
      <CancelInvoiceAction
        sourceId={INVOICE_ID}
        sourceNumber="F26-0042"
        status="sent"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /annuler la facture/i }),
    );

    expect(dialogManager.input).toHaveBeenCalledTimes(1);
    const config = vi.mocked(dialogManager.input).mock.calls[0][0];
    expect(config.title).toBe("Annuler la facture F26-0042 ?");
  });

  test("does not render for paid invoices", () => {
    mockUseMutation.mockReturnValue(vi.fn());

    setup(
      <CancelInvoiceAction
        sourceId={INVOICE_ID}
        sourceNumber="F26-0042"
        status="paid"
      />,
    );

    expect(
      screen.queryByRole("button", { name: /annuler la facture/i }),
    ).not.toBeInTheDocument();
  });

  test("input dialog rejects empty reasons before mutation", async () => {
    const cancel = vi.fn().mockResolvedValue({
      id: INVOICE_ID,
      restoredBLs: 1,
    });
    mockUseMutation.mockReturnValue(cancel);
    const { user } = setup(
      <CancelInvoiceAction
        sourceId={INVOICE_ID}
        sourceNumber="F26-0042"
        status="draft"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /annuler la facture/i }),
    );

    const config = vi.mocked(dialogManager.input).mock.calls[0][0];
    await expect(config.action.onClick("   ")).rejects.toThrow(
      "Raison requise",
    );
    expect(cancel).not.toHaveBeenCalled();
  });
});
