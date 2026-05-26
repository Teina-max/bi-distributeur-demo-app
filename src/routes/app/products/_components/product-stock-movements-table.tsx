import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/nowts/typography";
import { cn } from "@/lib/utils";
import type { StockMovementDto } from "@convex/stock_movements/dto/stockMovement";

const REASON_LABEL: Record<StockMovementDto["reason"], string> = {
  delivery_form_out: "Sortie BL",
  purchase_order_in: "Entrée BC",
  manual_adjustment: "Ajustement",
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
}

function formatDelta(delta: number): string {
  if (delta >= 0) return `+${delta}`;
  return String(delta);
}

type Props = {
  movements: readonly StockMovementDto[];
};

export function ProductStockMovementsTable({ movements }: Props) {
  const navigate = useNavigate();

  if (movements.length === 0) {
    return (
      <Typography variant="muted" className="text-[13px]">
        Aucun mouvement enregistré.
      </Typography>
    );
  }

  const goToReference = (movement: StockMovementDto) => {
    if (movement.referenceId === null) return;
    if (movement.referenceKind === "delivery_form") {
      void navigate({
        to: "/app/delivery-forms/$deliveryFormId",
        params: { deliveryFormId: String(movement.referenceId) },
      });
      return;
    }
    if (movement.referenceKind === "purchase_order") {
      toast.info("Page BC fournisseurs à venir (Lot L5).");
      return;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-1 text-[13px]">Date</TableHead>
          <TableHead className="py-1 text-right text-[13px]">Delta</TableHead>
          <TableHead className="py-1 text-[13px]">Raison</TableHead>
          <TableHead className="py-1 text-[13px]">Référence</TableHead>
          <TableHead className="py-1 text-[13px]">Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((movement) => {
          const hasReference = movement.referenceId !== null;
          return (
            <TableRow
              key={String(movement.id)}
              data-testid={`stock-movement-row-${String(movement.id)}`}
            >
              <TableCell className="py-1 font-mono text-[13px] tabular-nums">
                {formatDate(movement.createdAt)}
              </TableCell>
              <TableCell
                className={cn(
                  "py-1 text-right font-mono text-[13px] tabular-nums",
                  movement.delta < 0 ? "text-destructive" : "text-foreground",
                )}
              >
                {formatDelta(movement.delta)}
              </TableCell>
              <TableCell className="py-1 text-[13px]">
                {REASON_LABEL[movement.reason]}
              </TableCell>
              <TableCell className="py-1 text-[13px]">
                {hasReference ? (
                  <button
                    type="button"
                    onClick={() => goToReference(movement)}
                    className="text-foreground underline-offset-2 hover:underline"
                    data-testid={`stock-movement-ref-${String(movement.id)}`}
                  >
                    Voir
                  </button>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="py-1 text-[13px]">
                {movement.note ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
