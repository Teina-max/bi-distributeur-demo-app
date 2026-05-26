import { describe, expect, test, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import type { Id } from "@convex/_generated/dataModel";
import { ReceiveDialogBody } from "@/routes/app/purchase-orders/_components/receive-dialog-body";
import { setup } from "@/test/setup";

const productId = (n: number) => `prod_${n}` as unknown as Id<"products">;

const baseLines = [
  {
    product_id: String(productId(1)),
    product_code: "CAF-001",
    product_name: "Café Toscano 1kg",
    quantity_ordered: 10,
    quantity_received: 0,
    unit_purchase_price_ht: 8,
    vat_rate: 20,
  },
  {
    product_id: String(productId(2)),
    product_code: "ACC-001",
    product_name: "Filtre permanent",
    quantity_ordered: 5,
    quantity_received: 2,
    unit_purchase_price_ht: 12,
    vat_rate: 20,
  },
] as const;

describe("ReceiveDialogBody", () => {
  test("defaults each input to remaining (ordered − already received)", () => {
    const { getByTestId } = setup(
      <ReceiveDialogBody lines={[...baseLines]} onSubmitReceipts={vi.fn()} />,
    );
    const input0 = getByTestId("receive-input-0") as HTMLInputElement;
    const input1 = getByTestId("receive-input-1") as HTMLInputElement;
    expect(input0.value).toBe("10");
    expect(input1.value).toBe("3");
  });

  test("typing a value > remaining marks the line invalid and shows the error", () => {
    const { getByTestId, queryByTestId } = setup(
      <ReceiveDialogBody lines={[...baseLines]} onSubmitReceipts={vi.fn()} />,
    );
    const input1 = getByTestId("receive-input-1") as HTMLInputElement;
    fireEvent.change(input1, { target: { value: "999" } });
    expect(input1.getAttribute("aria-invalid")).toBe("true");
    expect(queryByTestId("receive-error")).not.toBeNull();
  });

  test("submit filters deltas > 0 and calls onSubmitReceipts with proper payload", async () => {
    const onSubmitReceipts = vi.fn().mockResolvedValue(undefined);
    const { getByTestId } = setup(
      <ReceiveDialogBody
        lines={[...baseLines]}
        onSubmitReceipts={onSubmitReceipts}
      />,
    );
    // Set line 0 to 7, line 1 to 0
    fireEvent.change(getByTestId("receive-input-0"), {
      target: { value: "7" },
    });
    fireEvent.change(getByTestId("receive-input-1"), {
      target: { value: "0" },
    });
    fireEvent.submit(getByTestId("receive-dialog-form"));
    expect(onSubmitReceipts).toHaveBeenCalledTimes(1);
    const payload = onSubmitReceipts.mock.calls[0]?.[0] as {
      product_id: Id<"products">;
      delta: number;
    }[];
    expect(payload).toHaveLength(1);
    expect(payload[0]?.delta).toBe(7);
    expect(String(payload[0]?.product_id)).toBe(String(productId(1)));
  });

  test("submit with invalid line does NOT call onSubmitReceipts", () => {
    const onSubmitReceipts = vi.fn();
    const { getByTestId } = setup(
      <ReceiveDialogBody
        lines={[...baseLines]}
        onSubmitReceipts={onSubmitReceipts}
      />,
    );
    fireEvent.change(getByTestId("receive-input-1"), {
      target: { value: "999" },
    });
    fireEvent.submit(getByTestId("receive-dialog-form"));
    expect(onSubmitReceipts).not.toHaveBeenCalled();
  });

  test("submit with all deltas 0 does NOT call onSubmitReceipts", () => {
    const onSubmitReceipts = vi.fn();
    const { getByTestId } = setup(
      <ReceiveDialogBody
        lines={[...baseLines]}
        onSubmitReceipts={onSubmitReceipts}
      />,
    );
    fireEvent.change(getByTestId("receive-input-0"), {
      target: { value: "0" },
    });
    fireEvent.change(getByTestId("receive-input-1"), {
      target: { value: "0" },
    });
    fireEvent.submit(getByTestId("receive-dialog-form"));
    expect(onSubmitReceipts).not.toHaveBeenCalled();
  });
});
