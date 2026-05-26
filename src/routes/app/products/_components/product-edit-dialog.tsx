import { Form, useForm } from "@/features/form/tanstack-form";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { toastClientError } from "@/lib/errors/client-error-message";
import { api } from "@convex/_generated/api";
import type { ProductDetailDto } from "@convex/products/dto/productDetail";
import { useMutation as useConvexMutation } from "convex/react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

// Optional text inputs: empty string in form → null in patch.
// Required text fields stay non-empty strings (validated by zod min(1)).
// Numbers use z.coerce.number() because FormInput emits strings.
const ProductEditSchema = z.object({
  code: z.string().min(1, "Code requis"),
  name: z.string().min(1, "Nom requis"),
  category: z.string().min(1, "Catégorie requise"),
  conditioning: z.string(),
  description: z.string(),
  price_ht: z.coerce.number().min(0, "Prix HT >= 0"),
  vat_rate: z.coerce.number().min(0, "TVA >= 0"),
  purchase_price_ht: z.coerce.number().min(0, "Prix achat HT >= 0"),
  price_2_ttc: z.coerce.number().min(0, "Prix 2 TTC >= 0"),
  price_3_ttc: z.coerce.number().min(0, "Prix 3 TTC >= 0"),
  // Nullable number: kept as string in form, coerced on submit.
  // Empty string => null in patch. Non-empty must parse to a number >= 0.
  stock_threshold: z
    .string()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: "Seuil >= 0 ou vide",
    }),
  sub_family: z.string(),
  family_code: z.string(),
  supplier_ref: z.string(),
  accounting_sale_code: z.string(),
  accounting_purchase_code: z.string(),
});

type ProductEditValues = z.infer<typeof ProductEditSchema>;

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function ProductEditDialogContent({
  formId,
  product,
}: {
  formId: string;
  product: ProductDetailDto;
}) {
  const updateProduct = useConvexMutation(api.products.mutations.updateProduct);

  const defaultValues: ProductEditValues = {
    code: product.code,
    name: product.name,
    category: product.category,
    conditioning: product.conditioning ?? "",
    description: product.description,
    price_ht: product.priceHT,
    vat_rate: product.vatRate,
    purchase_price_ht: product.purchasePriceHT ?? 0,
    price_2_ttc: product.price2TTC ?? 0,
    price_3_ttc: product.price3TTC ?? 0,
    stock_threshold:
      product.stockThreshold === null ? "" : String(product.stockThreshold),
    sub_family: product.subFamily ?? "",
    family_code: product.familyCode ?? "",
    supplier_ref: product.supplierRef ?? "",
    accounting_sale_code: product.accountingSaleCode ?? "",
    accounting_purchase_code: product.accountingPurchaseCode ?? "",
  };

  const handleSubmit = async (values: ProductEditValues) => {
    try {
      const stockThreshold =
        values.stock_threshold.trim() === ""
          ? null
          : Number(values.stock_threshold);

      await updateProduct({
        id: product.id,
        patch: {
          code: values.code.trim(),
          name: values.name.trim(),
          category: values.category.trim(),
          description: values.description,
          conditioning: emptyToNull(values.conditioning),
          price_ht: Number(values.price_ht),
          vat_rate: Number(values.vat_rate),
          purchase_price_ht: Number(values.purchase_price_ht),
          price_2_ttc: Number(values.price_2_ttc),
          price_3_ttc: Number(values.price_3_ttc),
          stock_threshold: stockThreshold,
          sub_family: emptyToNull(values.sub_family),
          family_code: emptyToNull(values.family_code),
          supplier_ref: emptyToNull(values.supplier_ref),
          accounting_sale_code: emptyToNull(values.accounting_sale_code),
          accounting_purchase_code: emptyToNull(
            values.accounting_purchase_code,
          ),
        },
      });
      toast.success("Produit mis à jour");
      dialogManager.closeAll();
    } catch (error) {
      toastClientError(error, "Échec de la mise à jour du produit");
    }
  };

  const form = useForm({
    schema: ProductEditSchema,
    defaultValues,
    onSubmit: handleSubmit,
  });

  return (
    <Form id={formId} form={form} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Identité
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form.AppField name="code">
            {(field) => (
              <field.Field>
                <field.Label>Code</field.Label>
                <field.Content>
                  <field.Input />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="name">
            {(field) => (
              <field.Field>
                <field.Label>Nom</field.Label>
                <field.Content>
                  <field.Input />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="category">
            {(field) => (
              <field.Field>
                <field.Label>Catégorie</field.Label>
                <field.Content>
                  <field.Input />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="conditioning">
            {(field) => (
              <field.Field>
                <field.Label>Conditionnement</field.Label>
                <field.Content>
                  <field.Input placeholder="Optionnel" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Description
        </h3>
        <form.AppField name="description">
          {(field) => (
            <field.Field>
              <field.Label>Description</field.Label>
              <field.Content>
                <field.Textarea rows={3} />
                <field.Message />
              </field.Content>
            </field.Field>
          )}
        </form.AppField>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Prix
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form.AppField name="price_ht">
            {(field) => (
              <field.Field>
                <field.Label>Prix HT (€)</field.Label>
                <field.Content>
                  <field.Input type="number" step="0.01" min="0" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="vat_rate">
            {(field) => (
              <field.Field>
                <field.Label>TVA (%)</field.Label>
                <field.Content>
                  <field.Input type="number" step="0.1" min="0" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="purchase_price_ht">
            {(field) => (
              <field.Field>
                <field.Label>Prix achat HT (€)</field.Label>
                <field.Content>
                  <field.Input type="number" step="0.01" min="0" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="price_2_ttc">
            {(field) => (
              <field.Field>
                <field.Label>Prix 2 TTC (€)</field.Label>
                <field.Content>
                  <field.Input type="number" step="0.01" min="0" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="price_3_ttc">
            {(field) => (
              <field.Field>
                <field.Label>Prix 3 TTC (€)</field.Label>
                <field.Content>
                  <field.Input type="number" step="0.01" min="0" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Stock
        </h3>
        <form.AppField name="stock_threshold">
          {(field) => (
            <field.Field>
              <field.Label>Seuil alerte stock</field.Label>
              <field.Content>
                <field.Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Laisser vide pour désactiver"
                />
                <field.Message />
              </field.Content>
            </field.Field>
          )}
        </form.AppField>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Catégorisation Heritage
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form.AppField name="sub_family">
            {(field) => (
              <field.Field>
                <field.Label>Sous-famille</field.Label>
                <field.Content>
                  <field.Input placeholder="Optionnel" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="family_code">
            {(field) => (
              <field.Field>
                <field.Label>Code famille</field.Label>
                <field.Content>
                  <field.Input placeholder="Optionnel" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="supplier_ref">
            {(field) => (
              <field.Field>
                <field.Label>Réf. fournisseur</field.Label>
                <field.Content>
                  <field.Input placeholder="Optionnel" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="accounting_sale_code">
            {(field) => (
              <field.Field>
                <field.Label>Code compta vente</field.Label>
                <field.Content>
                  <field.Input placeholder="Optionnel" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="accounting_purchase_code">
            {(field) => (
              <field.Field>
                <field.Label>Code compta achat</field.Label>
                <field.Content>
                  <field.Input placeholder="Optionnel" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
        </div>
      </section>
    </Form>
  );
}

export function openProductEditDialog(product: ProductDetailDto) {
  const formId = `product-edit-${product.id}`;

  dialogManager.custom({
    title: "Modifier le produit",
    description: `Modifier les champs du produit ${product.code}.`,
    icon: Pencil,
    size: "lg",
    children: <ProductEditDialogContent formId={formId} product={product} />,
    action: {
      label: "Enregistrer",
      form: formId,
    },
  });
}
