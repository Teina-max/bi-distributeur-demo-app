import { useRouter } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
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
import { ConvertActions } from "@/features/conversions/convert-actions";
import type { DeliveryFormDetailDto } from "@convex/delivery_forms/dto/deliveryFormDetail";
import type { StockMovementDto } from "@convex/stock_movements/dto/stockMovement";

type Status = DeliveryFormDetailDto["status"];

const STATUS_LABEL: Record<Status, string> = {
  in_preparation: "En préparation",
  ready_to_ship: "Prêt à expédier",
  shipped: "Expédié",
  delivered: "Livré",
  invoiced: "Facturé",
  cancelled: "Annulé",
};

const STATUS_VARIANT: Record<
  Status,
  "default" | "secondary" | "outline" | "destructive"
> = {
  in_preparation: "secondary",
  ready_to_ship: "secondary",
  shipped: "default",
  delivered: "default",
  invoiced: "outline",
  cancelled: "destructive",
};

const NEXT_TRANSITION: Partial<
  Record<
    Status,
    { target: "ready_to_ship" | "shipped" | "delivered"; label: string }
  >
> = {
  in_preparation: { target: "ready_to_ship", label: "Marquer prêt à expédier" },
  ready_to_ship: { target: "shipped", label: "Marquer expédié" },
  shipped: { target: "delivered", label: "Marquer livré" },
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

function TransitionButton({
  deliveryFormId,
  status,
}: {
  deliveryFormId: DeliveryFormDetailDto["id"];
  status: Status;
}) {
  const router = useRouter();
  const transition = useMutation(api.delivery_forms.mutations.transitionStatus);
  const next = NEXT_TRANSITION[status];
  if (!next) return null;

  return (
    <Button
      type="button"
      size="sm"
      onClick={async () => {
        try {
          const result = await transition({
            id: deliveryFormId,
            target: next.target,
          });
          toast.success(`BL passé en ${STATUS_LABEL[result.status]}`);
          void router.invalidate();
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Transition impossible",
          );
        }
      }}
      data-testid={`delivery-form-transition-${next.target}`}
    >
      {next.label}
    </Button>
  );
}

export function DeliveryFormDetail({
  deliveryForm,
  stockMovements,
}: {
  deliveryForm: DeliveryFormDetailDto;
  stockMovements: readonly StockMovementDto[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between gap-4">
            <CardTitle className="font-mono text-base">
              BL {deliveryForm.number}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[deliveryForm.status]}>
                {STATUS_LABEL[deliveryForm.status]}
              </Badge>
              <TransitionButton
                deliveryFormId={deliveryForm.id}
                status={deliveryForm.status}
              />
            </div>
          </div>
          <CardDescription>
            <span className="font-mono">{deliveryForm.client.code}</span>{" "}
            {deliveryForm.client.name}
            {deliveryForm.deliveredAt !== null
              ? ` · livré ${formatDate(deliveryForm.deliveredAt)}`
              : null}
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
                  Qté
                </TableHead>
                <TableHead className="py-1.5 text-right text-[13px]">
                  PU HT
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
              {deliveryForm.lines.map((line, i) => (
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
                    {line.quantity}
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                    {formatAmount(line.unit_price_ht)} €
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                    {formatAmount(line.vat_rate)} %
                  </TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                    {formatAmount(line.line_total_ht)} €
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex justify-end gap-6">
            <Typography variant="muted">
              Total HT : {formatAmount(deliveryForm.total_ht)} €
            </Typography>
            <Typography variant="large" className="font-mono tabular-nums">
              Total TTC : {formatAmount(deliveryForm.total_ttc)} €
            </Typography>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mouvements de stock</CardTitle>
          <CardDescription>
            Inserts liés à ce BL (lecture seule, audit).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockMovements.length === 0 ? (
            <Typography variant="muted">Aucun mouvement de stock.</Typography>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1.5 text-[13px]">Produit</TableHead>
                  <TableHead className="py-1.5 text-right text-[13px]">
                    Delta
                  </TableHead>
                  <TableHead className="py-1.5 text-[13px]">Raison</TableHead>
                  <TableHead className="py-1.5 text-[13px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockMovements.map((movement) => (
                  <TableRow key={String(movement.id)}>
                    <TableCell className="py-1.5 font-mono text-[13px]">
                      {movement.productCode}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                      {movement.delta}
                    </TableCell>
                    <TableCell className="py-1.5 text-[13px]">
                      {movement.reason}
                    </TableCell>
                    <TableCell className="py-1.5 font-mono text-[13px] tabular-nums">
                      {formatDate(movement.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {deliveryForm.status === "delivered" ? (
        <ConvertActions
          kind="invoice"
          sourceId={deliveryForm.id}
          sourceNumber={deliveryForm.number}
        />
      ) : null}
    </div>
  );
}
