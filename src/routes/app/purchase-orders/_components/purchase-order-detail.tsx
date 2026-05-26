import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/nowts/typography";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { PurchaseOrderDetailDto } from "@convex/purchase_orders/dto/purchaseOrderDetail";
import { ReceiveDialogBody } from "./receive-dialog-body";

const STATUS_LABEL: Record<PurchaseOrderDetailDto["status"], string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  partially_received: "Reçu partiel",
  received: "Reçu",
  cancelled: "Annulé",
};

const STATUS_VARIANT: Record<
  PurchaseOrderDetailDto["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  sent: "default",
  partially_received: "outline",
  received: "default",
  cancelled: "destructive",
};

function formatDate(ms: number | null): string {
  if (ms === null) return "—";
  return new Date(ms).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
}

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const RECEIVABLE_STATUSES: PurchaseOrderDetailDto["status"][] = [
  "draft",
  "sent",
  "partially_received",
];

export function PurchaseOrderDetail({
  purchaseOrder,
}: {
  purchaseOrder: PurchaseOrderDetailDto;
}) {
  const navigate = useNavigate();
  const receive = useMutation(api.purchase_orders.mutations.receive);

  const canReceive = RECEIVABLE_STATUSES.includes(purchaseOrder.status);

  const openReceiveDialog = () => {
    if (!canReceive) {
      toast.error("BC non réceptionnable (déjà reçu ou annulé).");
      return;
    }
    dialogManager.custom({
      title: `Réception BC ${purchaseOrder.number}`,
      description:
        "Saisir la quantité reçue maintenant pour chaque ligne. Échap pour annuler.",
      size: "xl",
      children: (
        <ReceiveDialogBody
          lines={purchaseOrder.lines}
          onSubmitReceipts={async (receipts) => {
            try {
              const result = await receive({
                id: purchaseOrder.id as unknown as Id<"purchase_orders">,
                receipts,
              });
              toast.success(
                result.status === "received"
                  ? `BC ${purchaseOrder.number} entièrement reçu.`
                  : `Réception partielle enregistrée (${purchaseOrder.number}).`,
              );
              dialogManager.closeAll();
              await navigate({
                to: "/app/purchase-orders/$purchaseOrderId",
                params: { purchaseOrderId: String(purchaseOrder.id) },
              });
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Erreur réception",
              );
              throw err;
            }
          }}
        />
      ),
      action: {
        label: "Continuer (Entrée)",
        form: "receive-form",
      },
      cancel: { label: "Annuler (Échap)" },
    });
  };

  useKeyboardScope("purchase-order-detail", {
    F8: () => {
      openReceiveDialog();
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between gap-4">
            <CardTitle className="font-mono text-base">
              BC {purchaseOrder.number}
            </CardTitle>
            <Badge variant={STATUS_VARIANT[purchaseOrder.status]}>
              {STATUS_LABEL[purchaseOrder.status]}
            </Badge>
          </div>
          <CardDescription>
            <span className="font-mono">{purchaseOrder.supplier.code}</span>{" "}
            {purchaseOrder.supplier.name} · reçu le{" "}
            {formatDate(purchaseOrder.receivedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-1.5 text-[13px]">#</TableHead>
                <TableHead className="py-1.5 text-[13px]">Code</TableHead>
                <TableHead className="py-1.5 text-[13px]">
                  Désignation
                </TableHead>
                <TableHead className="py-1.5 text-right text-[13px]">
                  Cmd.
                </TableHead>
                <TableHead className="py-1.5 text-right text-[13px]">
                  Reçu
                </TableHead>
                <TableHead className="py-1.5 text-right text-[13px]">
                  PU achat HT
                </TableHead>
                <TableHead className="py-1.5 text-right text-[13px]">
                  TVA
                </TableHead>
                <TableHead className="py-1.5 text-right text-[13px]">
                  Total HT
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrder.lines.map((line, i) => {
                const total =
                  Math.round(
                    line.quantity_ordered * line.unit_purchase_price_ht * 100,
                  ) / 100;
                return (
                  <TableRow key={`${line.product_id}-${i}`}>
                    <TableCell className="py-1.5 font-mono text-[13px] tabular-nums">
                      {i + 1}
                    </TableCell>
                    <TableCell className="py-1.5 font-mono text-[13px]">
                      {line.product_code}
                    </TableCell>
                    <TableCell className="py-1.5 text-[13px]">
                      {line.product_name}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                      {line.quantity_ordered}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                      {line.quantity_received}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                      {formatAmount(line.unit_purchase_price_ht)} €
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                      {formatAmount(line.vat_rate)} %
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                      {formatAmount(total)} €
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="mt-3 flex justify-end gap-6">
            <Typography variant="muted">
              Total HT : {formatAmount(purchaseOrder.total_ht)} €
            </Typography>
            <Typography variant="large" className="font-mono tabular-nums">
              Total TTC : {formatAmount(purchaseOrder.total_ttc)} €
            </Typography>
          </div>
        </CardContent>
      </Card>

      {canReceive ? (
        <div className="flex justify-end">
          <Button
            onClick={openReceiveDialog}
            data-testid="receive-button"
            size="sm"
          >
            Réception
            <kbd className="bg-primary-foreground/20 text-primary-foreground ml-2 inline-flex h-4 items-center rounded border border-current/30 px-1 font-mono text-[10px]">
              F8
            </kbd>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
