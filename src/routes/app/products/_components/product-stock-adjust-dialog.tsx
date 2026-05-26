import { Form, useForm } from "@/features/form/tanstack-form";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { toastClientError } from "@/lib/errors/client-error-message";
import { api } from "@convex/_generated/api";
import type { ProductDetailDto } from "@convex/products/dto/productDetail";
import { useMutation } from "convex/react";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const StockAdjustSchema = z.object({
  delta: z.coerce.number().refine((v) => v !== 0, "Delta non nul"),
  reason: z.string().trim().min(3, "Raison obligatoire (3+ caractères)"),
});

type StockAdjustValues = z.infer<typeof StockAdjustSchema>;

function StockAdjustDialogContent({
  formId,
  product,
}: {
  formId: string;
  product: ProductDetailDto;
}) {
  const adjustStock = useMutation(api.products.mutations.adjustStock);

  const form = useForm({
    schema: StockAdjustSchema,
    defaultValues: { delta: 0, reason: "" } as StockAdjustValues,
    onSubmit: async (values) => {
      try {
        const delta = Number(values.delta);
        await adjustStock({
          id: product.id,
          delta,
          reason: values.reason.trim(),
        });
        const sign = delta > 0 ? "+" : "";
        toast.success(`Stock ajusté (${sign}${delta})`);
        dialogManager.closeAll();
      } catch (error) {
        toastClientError(error, "Échec de l'ajustement de stock");
      }
    },
  });

  return (
    <Form id={formId} form={form} className="flex flex-col gap-4">
      <form.AppField name="delta">
        {(field) => (
          <field.Field>
            <field.Label>
              Delta (positif = entrée, négatif = sortie)
            </field.Label>
            <field.Content>
              <field.Input
                type="number"
                step="1"
                placeholder="+5 ou -3"
                autoFocus
              />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>
      <form.AppField name="reason">
        {(field) => (
          <field.Field>
            <field.Label>Raison</field.Label>
            <field.Content>
              <field.Input placeholder="Inventaire physique, casse, vol, retour fournisseur…" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>
    </Form>
  );
}

export function openStockAdjustDialog(product: ProductDetailDto) {
  const formId = `product-stock-adjust-${product.id}`;

  dialogManager.custom({
    title: `Ajuster stock — ${product.code}`,
    description: `Stock courant : ${product.stockQty}`,
    icon: Package,
    size: "md",
    children: <StockAdjustDialogContent formId={formId} product={product} />,
    action: {
      label: "Ajuster",
      form: formId,
    },
  });
}
