import { render, act } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";
import { ConvertActions } from "@/features/conversions/convert-actions";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";

const QUOTATION_ID = "q_test_001" as unknown as Id<"quotations">;
const DELIVERY_FORM_ID = "df_test_001" as unknown as Id<"delivery_forms">;

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
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
  mockUseQuery.mockReset();
  mockUseMutation.mockReset();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  vi.mocked(dialogManager.custom).mockClear();
  vi.mocked(dialogManager.confirm).mockClear();
});

function pressKey(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key }));
  });
}

describe("ConvertActions kind=bl", () => {
  test("F8 opens dialogManager.custom with stock preview entries", () => {
    mockUseQuery.mockReturnValue({
      quotation_number: "D26-0001",
      status: "draft",
      client_code: "CLI-001",
      client_name: "Café",
      lines: [
        {
          product_id: "p1",
          product_code: "CAF-001",
          quantity: 5,
          current_stock: 100,
        },
        {
          product_id: "p2",
          product_code: "CAF-002",
          quantity: 2,
          current_stock: 50,
        },
      ],
    });
    mockUseMutation.mockReturnValue(vi.fn());

    render(<ConvertActions kind="bl" sourceId={QUOTATION_ID} />);
    expect(dialogManager.custom).not.toHaveBeenCalled();

    pressKey("F8");

    expect(dialogManager.custom).toHaveBeenCalledTimes(1);
    const config = vi.mocked(dialogManager.custom).mock.calls[0][0];
    expect(config.title).toBe("Convertir le devis D26-0001 en BL ?");
    expect(config.size).toBe("md");
    expect(config.action?.label).toBe("Continuer (Entrée)");
    expect(typeof config.action?.onClick).toBe("function");
  });

  test("F8 with status=converted_to_delivery shows toast error, no dialog", () => {
    mockUseQuery.mockReturnValue({
      quotation_number: "D26-0001",
      status: "converted_to_delivery",
      client_code: "CLI-001",
      client_name: "Café",
      lines: [],
    });
    mockUseMutation.mockReturnValue(vi.fn());

    render(<ConvertActions kind="bl" sourceId={QUOTATION_ID} />);
    pressKey("F8");

    expect(dialogManager.custom).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Devis déjà converti");
  });

  test("F8 with no preview (null) shows toast error", () => {
    mockUseQuery.mockReturnValue(null);
    mockUseMutation.mockReturnValue(vi.fn());

    render(<ConvertActions kind="bl" sourceId={QUOTATION_ID} />);
    pressKey("F8");

    expect(dialogManager.custom).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Devis introuvable");
  });

  test("dialog action.onClick calls the convert mutation", async () => {
    const convertMock = vi.fn().mockResolvedValue({
      id: "df_new",
      number: "B26-0001",
    });
    mockUseQuery.mockReturnValue({
      quotation_number: "D26-0001",
      status: "draft",
      client_code: "CLI-001",
      client_name: "Café",
      lines: [
        {
          product_id: "p1",
          product_code: "CAF-001",
          quantity: 5,
          current_stock: 100,
        },
      ],
    });
    mockUseMutation.mockReturnValue(convertMock);

    render(<ConvertActions kind="bl" sourceId={QUOTATION_ID} />);
    pressKey("F8");

    const config = vi.mocked(dialogManager.custom).mock.calls[0][0];
    await config.action?.onClick?.();

    expect(convertMock).toHaveBeenCalledTimes(1);
    expect(convertMock).toHaveBeenCalledWith({ quotation_id: QUOTATION_ID });
  });
});

describe("ConvertActions kind=invoice", () => {
  test("F9 opens dialogManager.confirm with BL number", () => {
    mockUseQuery.mockReturnValue(null);
    mockUseMutation.mockReturnValue(vi.fn());

    render(
      <ConvertActions
        kind="invoice"
        sourceId={DELIVERY_FORM_ID}
        sourceNumber="B26-0042"
      />,
    );
    pressKey("F9");

    expect(dialogManager.confirm).toHaveBeenCalledTimes(1);
    const config = vi.mocked(dialogManager.confirm).mock.calls[0][0];
    expect(config.title).toBe("Convertir le BL B26-0042 en facture ?");
    expect(config.action.label).toBe("Continuer (Entrée)");
  });

  test("F9 dialog action.onClick calls the convert mutation", async () => {
    const convertMock = vi.fn().mockResolvedValue({
      id: "inv_new",
      number: "F26-0001",
    });
    mockUseQuery.mockReturnValue(null);
    mockUseMutation.mockReturnValue(convertMock);

    render(
      <ConvertActions
        kind="invoice"
        sourceId={DELIVERY_FORM_ID}
        sourceNumber="B26-0042"
      />,
    );
    pressKey("F9");

    const config = vi.mocked(dialogManager.confirm).mock.calls[0][0];
    await config.action.onClick?.();

    expect(convertMock).toHaveBeenCalledTimes(1);
    expect(convertMock).toHaveBeenCalledWith({
      delivery_form_ids: [DELIVERY_FORM_ID],
    });
  });
});
