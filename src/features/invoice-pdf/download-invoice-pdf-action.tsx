import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import type { InvoiceDetailDto } from "@convex/invoices/dto/invoiceDetail";
import { useDownloadInvoicePdf } from "./use-download-invoice-pdf";

type Props = {
  invoice: InvoiceDetailDto;
};

export function DownloadInvoicePdfAction({ invoice }: Props) {
  const { downloadPdf, isGenerating } = useDownloadInvoicePdf(invoice);

  useKeyboardScope("invoice-detail-pdf", {
    F4: () => {
      void downloadPdf();
    },
  });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void downloadPdf()}
      disabled={isGenerating}
      className="h-7 px-2 text-xs"
      data-testid="invoice-detail-action-pdf"
    >
      <FileDown data-icon="inline-start" />
      <span>{isGenerating ? "Génération…" : "Télécharger PDF"}</span>
      <kbd className="bg-muted text-muted-foreground ml-1.5 inline-flex h-4 items-center rounded border px-1 font-mono text-[10px]">
        F4
      </kbd>
    </Button>
  );
}
