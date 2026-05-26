import { Form, useForm } from "@/features/form/tanstack-form";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { toastClientError } from "@/lib/errors/client-error-message";
import { api } from "@convex/_generated/api";
import type { ClientDetailDto } from "@convex/clients/dto/clientDetail";
import { useMutation } from "convex/react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const ClientEditSchema = z.object({
  code: z.string().min(1, "Code requis"),
  name: z.string().min(1, "Nom requis"),
  type: z.string().min(1, "Type requis"),
  email: z
    .string()
    .refine(
      (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Email invalide",
    ),
  phone: z.string(),
  address_street: z.string(),
  address_postal_code: z.string(),
  address_city: z.string(),
  address_country: z.string().min(1, "Pays requis"),
  payment_terms_days: z.coerce.number().int().min(0).max(365),
  payment_terms_label: z.string().min(1, "Libellé requis"),
  correspondent: z.string(),
  vendor: z.string(),
  sector: z.string(),
  depot_cafe: z.string(),
  accounting_code: z.string(),
  credit_limit: z
    .string()
    .refine(
      (v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
      "Limite crédit >= 0 ou vide",
    ),
  global_discount_pct: z.coerce.number().min(0).max(100),
  tariff_level: z.coerce.number().int().min(1).max(3),
  vat_intra: z.string(),
  notes: z.string(),
});

type ClientEditValues = z.infer<typeof ClientEditSchema>;

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </h3>
  );
}

function ClientEditDialogContent({
  formId,
  client,
}: {
  formId: string;
  client: ClientDetailDto;
}) {
  const updateClient = useMutation(api.clients.mutations.updateClient);

  const defaultValues: ClientEditValues = {
    code: client.code,
    name: client.name,
    type: client.type,
    email: client.email ?? "",
    phone: client.phone ?? "",
    address_street: client.address.street,
    address_postal_code: client.address.postal_code,
    address_city: client.address.city,
    address_country: client.address.country,
    payment_terms_days: client.paymentTermsDays,
    payment_terms_label: client.paymentTermsLabel,
    correspondent: client.correspondent ?? "",
    vendor: client.vendor ?? "",
    sector: client.sector ?? "",
    depot_cafe: client.depotCafe ?? "",
    accounting_code: client.accountingCode ?? "",
    credit_limit: client.creditLimit === null ? "" : String(client.creditLimit),
    global_discount_pct: client.globalDiscountPct,
    tariff_level: client.tariffLevel,
    vat_intra: client.vatIntra ?? "",
    notes: client.notes,
  };

  const handleSubmit = async (values: ClientEditValues) => {
    try {
      const creditLimit =
        values.credit_limit.trim() === "" ? null : Number(values.credit_limit);

      await updateClient({
        id: client.id,
        patch: {
          code: values.code.trim(),
          name: values.name.trim(),
          type: values.type.trim(),
          email: emptyToNull(values.email),
          phone: emptyToNull(values.phone),
          address: {
            street: values.address_street.trim(),
            postal_code: values.address_postal_code.trim(),
            city: values.address_city.trim(),
            country: values.address_country.trim(),
          },
          payment_terms_days: Number(values.payment_terms_days),
          payment_terms_label: values.payment_terms_label.trim(),
          correspondent: emptyToNull(values.correspondent),
          vendor: emptyToNull(values.vendor),
          sector: emptyToNull(values.sector),
          depot_cafe: emptyToNull(values.depot_cafe),
          accounting_code: emptyToNull(values.accounting_code),
          credit_limit: creditLimit,
          global_discount_pct: Number(values.global_discount_pct),
          tariff_level: Number(values.tariff_level),
          vat_intra: emptyToNull(values.vat_intra),
          notes: values.notes,
        },
      });
      toast.success("Client mis à jour");
      dialogManager.closeAll();
    } catch (error) {
      toastClientError(error, "Échec de la mise à jour du client");
    }
  };

  const form = useForm({
    schema: ClientEditSchema,
    defaultValues,
    onSubmit: handleSubmit,
  });

  return (
    <Form
      id={formId}
      form={form}
      className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto"
    >
      <section className="flex flex-col gap-3">
        <SectionTitle>Identité</SectionTitle>
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
          <form.AppField name="type">
            {(field) => (
              <field.Field>
                <field.Label>Type</field.Label>
                <field.Content>
                  <field.Input />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="email">
            {(field) => (
              <field.Field>
                <field.Label>Email</field.Label>
                <field.Content>
                  <field.Input type="email" placeholder="Optionnel" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="phone">
            {(field) => (
              <field.Field>
                <field.Label>Téléphone</field.Label>
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
        <SectionTitle>Adresse</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form.AppField name="address_street">
            {(field) => (
              <field.Field>
                <field.Label>Rue</field.Label>
                <field.Content>
                  <field.Input />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="address_postal_code">
            {(field) => (
              <field.Field>
                <field.Label>Code postal</field.Label>
                <field.Content>
                  <field.Input />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="address_city">
            {(field) => (
              <field.Field>
                <field.Label>Ville</field.Label>
                <field.Content>
                  <field.Input />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="address_country">
            {(field) => (
              <field.Field>
                <field.Label>Pays</field.Label>
                <field.Content>
                  <field.Input />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>Intermédiaires</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form.AppField name="correspondent">
            {(field) => (
              <field.Field>
                <field.Label>Correspondant</field.Label>
                <field.Content>
                  <field.Input placeholder="Optionnel" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="vendor">
            {(field) => (
              <field.Field>
                <field.Label>Commercial</field.Label>
                <field.Content>
                  <field.Input placeholder="Optionnel" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="sector">
            {(field) => (
              <field.Field>
                <field.Label>Secteur</field.Label>
                <field.Content>
                  <field.Input placeholder="Optionnel" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="depot_cafe">
            {(field) => (
              <field.Field>
                <field.Label>Dépôt café</field.Label>
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
        <SectionTitle>Conditions commerciales</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form.AppField name="payment_terms_days">
            {(field) => (
              <field.Field>
                <field.Label>Délai paiement (jours)</field.Label>
                <field.Content>
                  <field.Input type="number" min="0" max="365" step="1" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="payment_terms_label">
            {(field) => (
              <field.Field>
                <field.Label>Libellé paiement</field.Label>
                <field.Content>
                  <field.Input placeholder="ex: 30j fin de mois" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="credit_limit">
            {(field) => (
              <field.Field>
                <field.Label>Limite crédit (€)</field.Label>
                <field.Content>
                  <field.Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Laisser vide si non plafonnée"
                  />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="global_discount_pct">
            {(field) => (
              <field.Field>
                <field.Label>Remise globale (%)</field.Label>
                <field.Content>
                  <field.Input type="number" step="0.1" min="0" max="100" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="tariff_level">
            {(field) => (
              <field.Field>
                <field.Label>Niveau tarif (1-3)</field.Label>
                <field.Content>
                  <field.Input type="number" min="1" max="3" step="1" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>Comptabilité</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form.AppField name="accounting_code">
            {(field) => (
              <field.Field>
                <field.Label>Code comptable</field.Label>
                <field.Content>
                  <field.Input placeholder="Optionnel" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="vat_intra">
            {(field) => (
              <field.Field>
                <field.Label>N° TVA intra</field.Label>
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
        <SectionTitle>Notes</SectionTitle>
        <form.AppField name="notes">
          {(field) => (
            <field.Field>
              <field.Label>Notes internes</field.Label>
              <field.Content>
                <field.Textarea rows={3} />
                <field.Message />
              </field.Content>
            </field.Field>
          )}
        </form.AppField>
      </section>
    </Form>
  );
}

export function openClientEditDialog(client: ClientDetailDto) {
  const formId = `client-edit-${client.id}`;

  dialogManager.custom({
    title: "Modifier le client",
    description: `Modifier les informations de ${client.code}.`,
    icon: Pencil,
    size: "xl",
    children: <ClientEditDialogContent formId={formId} client={client} />,
    action: {
      label: "Enregistrer",
      form: formId,
    },
  });
}
