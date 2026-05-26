import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { api } from "@convex/_generated/api";
import type { ClientDetailDto } from "@convex/clients/dto/clientDetail";
import { useMutation } from "convex/react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { openClientEditDialog } from "./client-edit-dialog";

type Props = {
  client: ClientDetailDto;
  isAdmin: boolean;
};

export function ClientIdentityCard({ client, isAdmin }: Props) {
  const archiveClient = useMutation(api.clients.mutations.archiveClient);

  const address = [
    client.address.street,
    `${client.address.postal_code} ${client.address.city}`,
    client.address.country,
  ].join(" · ");

  const intermediaryRows: [string, string][] = (
    [
      ["Correspondant", client.correspondent ?? ""],
      ["Commercial", client.vendor ?? ""],
      ["Secteur", client.sector ?? ""],
      ["Dépôt café", client.depotCafe ?? ""],
      ["Code comptable", client.accountingCode ?? ""],
      ["N° TVA intra", client.vatIntra ?? ""],
      [
        "Limite crédit",
        client.creditLimit !== null
          ? `${client.creditLimit.toLocaleString("fr-FR")} €`
          : "",
      ],
      [
        "Remise globale",
        client.globalDiscountPct > 0 ? `${client.globalDiscountPct} %` : "",
      ],
      ["Niveau tarif", client.tariffLevel > 1 ? `${client.tariffLevel}` : ""],
    ] as [string, string][]
  ).filter(([, v]) => v.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-base">{client.code}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Nom</dt>
            <dd className="text-[13px]" data-testid="client-detail-name">
              {client.name}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Type</dt>
            <dd
              className="font-mono text-[13px]"
              data-testid="client-detail-type"
            >
              {client.type}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Email</dt>
            <dd
              className="font-mono text-[13px]"
              data-testid="client-detail-email"
            >
              {client.email ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Téléphone</dt>
            <dd
              className="font-mono text-[13px]"
              data-testid="client-detail-phone"
            >
              {client.phone ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:col-span-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Adresse</dt>
            <dd className="text-[13px]" data-testid="client-detail-address">
              {address}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Paiement</dt>
            <dd className="text-[13px]" data-testid="client-detail-payment">
              {client.paymentTermsLabel}
            </dd>
          </div>
        </dl>
        {intermediaryRows.length > 0 ? (
          <dl className="mt-4 grid grid-cols-1 gap-2 border-t pt-4 sm:grid-cols-2">
            {intermediaryRows.map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-2 sm:flex-col sm:gap-0"
              >
                <dt className="text-muted-foreground text-[13px]">{label}</dt>
                <dd className="text-[13px]">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {client.notes.length > 0 ? (
          <p className="text-muted-foreground mt-4 text-[13px] whitespace-pre-line">
            {client.notes}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openClientEditDialog(client)}
          >
            <Pencil className="size-4" />
            Modifier
          </Button>
          {isAdmin ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                dialogManager.confirm({
                  variant: "destructive",
                  title: "Archiver ce client ?",
                  description: `${client.code} sera masqué des listes. L'historique reste accessible.`,
                  confirmText: client.code,
                  action: {
                    label: "Archiver",
                    variant: "destructive",
                    onClick: async () => {
                      await archiveClient({ id: client.id });
                      toast.success("Client archivé");
                    },
                  },
                })
              }
            >
              Archiver
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
