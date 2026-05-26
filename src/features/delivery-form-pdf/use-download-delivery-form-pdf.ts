import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { DeliveryFormDetailDto } from "@convex/delivery_forms/dto/deliveryFormDetail";

export function useDownloadDeliveryFormPdf(
  deliveryForm: DeliveryFormDetailDto,
) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const { renderDeliveryFormPdfBlob } =
        await import("./delivery-form-pdf-document");
      const blob = await renderDeliveryFormPdfBlob(deliveryForm);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${deliveryForm.number}.pdf`;
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
  }, [deliveryForm, isGenerating]);

  return { downloadPdf, isGenerating };
}
