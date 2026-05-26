import { act } from "@testing-library/react";
import { useNavigate } from "@tanstack/react-router";
import { describe, expect, test, vi } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import type { DeliveryFormListItemDto } from "@convex/delivery_forms/dto/deliveryFormListItem";
import type { InvoiceListItemDto } from "@convex/invoices/dto/invoiceListItem";
import type { QuotationListItemDto } from "@convex/quotations/dto/quotationListItem";
import { ClientRecentDeliveryFormsTable } from "@/routes/app/clients/_components/client-recent-delivery-forms-table";
import { ClientRecentInvoicesTable } from "@/routes/app/clients/_components/client-recent-invoices-table";
import { ClientRecentQuotationsTable } from "@/routes/app/clients/_components/client-recent-quotations-table";
import { setup } from "@/test/setup";

const press = (key: string) => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
};

const quotation: QuotationListItemDto = {
  id: "q_001" as unknown as Id<"quotations">,
  number: "D26-0001",
  clientCode: "CLI-001",
  clientName: "BISTROT DU PORT",
  total_ht: 100,
  total_ttc: 120,
  status: "draft",
  createdAt: 1_700_000_000_000,
};

const deliveryForm: DeliveryFormListItemDto = {
  id: "df_001" as unknown as Id<"delivery_forms">,
  number: "B26-0001",
  clientCode: "CLI-001",
  clientName: "BISTROT DU PORT",
  total_ht: 100,
  total_ttc: 120,
  status: "delivered",
  deliveredAt: 1_700_000_000_000,
  createdAt: 1_700_000_000_000,
};

const invoice: InvoiceListItemDto = {
  id: "inv_001" as unknown as Id<"invoices">,
  number: "F26-0001",
  clientCode: "CLI-001",
  clientName: "BISTROT DU PORT",
  total_ht: 100,
  total_ttc: 120,
  status: "sent",
  dueDate: 1_700_086_400_000,
  sentAt: 1_700_000_000_000,
  createdAt: 1_700_000_000_000,
};

describe("client recent document tables", () => {
  test("quotation table Enter navigates to quotation detail", () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);
    setup(<ClientRecentQuotationsTable rows={[quotation]} />);

    act(() => press("Enter"));

    expect(navigate).toHaveBeenCalledWith({
      to: "/app/quotations/$quotationId",
      params: { quotationId: "q_001" },
    });
  });

  test("delivery forms table Enter navigates to BL detail", () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);
    setup(<ClientRecentDeliveryFormsTable rows={[deliveryForm]} />);

    act(() => press("Enter"));

    expect(navigate).toHaveBeenCalledWith({
      to: "/app/delivery-forms/$deliveryFormId",
      params: { deliveryFormId: "df_001" },
    });
  });

  test("invoices table Enter navigates to invoice detail", () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);
    setup(<ClientRecentInvoicesTable rows={[invoice]} />);

    act(() => press("Enter"));

    expect(navigate).toHaveBeenCalledWith({
      to: "/app/invoices/$invoiceId",
      params: { invoiceId: "inv_001" },
    });
  });
});
