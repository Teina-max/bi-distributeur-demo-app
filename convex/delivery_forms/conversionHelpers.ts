import type { Doc } from "@convex/_generated/dataModel";
import { yearTwoDigits } from "@convex/utils/dateFns";

export const CONVERTIBLE_QUOTATION_STATUSES = [
  "draft",
  "sent",
  "accepted",
] as const;

export type ConvertibleQuotationStatus =
  (typeof CONVERTIBLE_QUOTATION_STATUSES)[number];

export function assertConvertibleQuotationStatus(
  status: Doc<"quotations">["status"],
): asserts status is ConvertibleQuotationStatus {
  if (status === "converted_to_delivery") {
    throw new Error("Devis déjà converti");
  }
  if (
    !CONVERTIBLE_QUOTATION_STATUSES.includes(
      status as ConvertibleQuotationStatus,
    )
  ) {
    throw new Error(`Statut devis incompatible: ${status}`);
  }
}

export function assertInvoiceableDeliveryFormStatus(
  status: Doc<"delivery_forms">["status"],
): asserts status is "delivered" {
  if (status === "invoiced") {
    throw new Error("BL déjà facturé");
  }
  if (status !== "delivered") {
    throw new Error(`Statut BL incompatible: ${status}`);
  }
}

export type StockCheckLine = {
  product_code: string;
  quantity: number;
  current_stock: number;
};

export function assertSufficientStock(lines: readonly StockCheckLine[]): void {
  for (const line of lines) {
    if (line.current_stock < line.quantity) {
      throw new Error(
        `Stock insuffisant: ${line.product_code} (dispo: ${line.current_stock}, demandé: ${line.quantity})`,
      );
    }
  }
}

const DAY_MS = 86_400_000;

export function computeDueDateMs(
  creationMs: number,
  paymentTermsDays: number,
): number {
  return creationMs + paymentTermsDays * DAY_MS;
}

export function currentYearPrefix(now: number = Date.now()): string {
  return yearTwoDigits(now);
}
