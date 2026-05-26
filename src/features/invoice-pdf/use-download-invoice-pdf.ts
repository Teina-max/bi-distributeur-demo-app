import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { InvoiceDetailDto } from "@convex/invoices/dto/invoiceDetail";

export function useDownloadInvoicePdf(invoice: InvoiceDetailDto) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const { renderInvoicePdfBlob } = await import("./invoice-pdf-document");
      const blob = await renderInvoicePdfBlob(invoice);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Échec génération du PDF",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [invoice, isGenerating]);

  return { downloadPdf, isGenerating };
}
