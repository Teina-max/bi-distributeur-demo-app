import type { Doc, Id } from "@convex/_generated/dataModel";
import { computeVatBreakdown } from "@convex/utils/vatBreakdown";

export type SupplyLineSnapshot = Doc<"purchase_orders">["lines"][number];

export type SupplyLineInput = {
  product_id: Id<"products">;
  product_code: string;
  product_name: string;
  quantity_ordered: number;
  unit_purchase_price_ht: number;
  vat_rate: number;
};

export function buildPurchaseLineSnapshot(
  input: SupplyLineInput,
): SupplyLineSnapshot {
  return {
    product_id: input.product_id,
    product_code: input.product_code,
    product_name: input.product_name,
    quantity_ordered: input.quantity_ordered,
    quantity_received: 0,
    unit_purchase_price_ht: input.unit_purchase_price_ht,
    vat_rate: input.vat_rate,
  };
}

type RecomputedTotals = {
  total_ht: number;
  total_vat: number;
  total_ttc: number;
};

export function recomputeSupplyTotals(
  lines: readonly SupplyLineSnapshot[],
): RecomputedTotals {
  const breakdown = computeVatBreakdown(
    lines.map((line) => ({
      quantity: line.quantity_ordered,
      unit_price_ht: line.unit_purchase_price_ht,
      vat_rate: line.vat_rate,
    })),
  );
  return {
    total_ht: breakdown.total_ht,
    total_vat: breakdown.total_vat,
    total_ttc: breakdown.total_ttc,
  };
}

export type PurchaseOrderStatus = Doc<"purchase_orders">["status"];

const RECEIVABLE_STATUSES = ["draft", "sent", "partially_received"] as const;

export function assertReceivablePurchaseOrderStatus(
  status: PurchaseOrderStatus,
): void {
  if (status === "received") {
    throw new Error("BC déjà reçu");
  }
  if (status === "cancelled") {
    throw new Error("BC annulé : réception impossible");
  }
  if (
    !RECEIVABLE_STATUSES.includes(
      status as (typeof RECEIVABLE_STATUSES)[number],
    )
  ) {
    throw new Error(`Statut BC incompatible: ${status}`);
  }
}

/**
 * Compute the next BC status after applying receipts.
 * - If every line has quantity_received >= quantity_ordered → "received".
 * - Else if any line has quantity_received > 0 → "partially_received".
 * - Else → keep current status (no-op edge case).
 */
export function nextPurchaseOrderStatusAfterReceipts(
  lines: readonly SupplyLineSnapshot[],
  currentStatus: PurchaseOrderStatus,
): PurchaseOrderStatus {
  const allReceived = lines.every(
    (line) => line.quantity_received >= line.quantity_ordered,
  );
  if (allReceived) return "received";
  const anyReceived = lines.some((line) => line.quantity_received > 0);
  if (anyReceived) return "partially_received";
  return currentStatus;
}
