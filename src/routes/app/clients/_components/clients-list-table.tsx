import { useNavigate } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/nowts/typography";
import { useTableKeyboardNav } from "@/hooks/use-table-keyboard-nav";
import { cn } from "@/lib/utils";
import type { ClientListItemDto } from "@convex/clients/dto/clientListItem";

type Row = Omit<ClientListItemDto, "id"> & { id: string };

export function ClientsListTable({
  items,
}: {
  items: readonly ClientListItemDto[];
}) {
  const navigate = useNavigate();
  const rows: Row[] = items.map((item) => ({ ...item, id: String(item.id) }));

  const { getRowProps } = useTableKeyboardNav<Row>(rows, {
    scopeId: "clients-list",
    onActivate: (row) =>
      void navigate({
        to: "/app/clients/$clientId",
        params: { clientId: row.id },
      }),
  });

  if (rows.length === 0) {
    return (
      <Typography variant="muted" className="text-[13px]">
        Aucun client trouvé.
      </Typography>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-1 text-[13px]">Code</TableHead>
          <TableHead className="py-1 text-[13px]">Nom</TableHead>
          <TableHead className="py-1 text-[13px]">Ville</TableHead>
          <TableHead className="py-1 text-[13px]">Email</TableHead>
          <TableHead className="py-1 text-[13px]">Téléphone</TableHead>
          <TableHead className="py-1 text-[13px]">Paiement</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const props = getRowProps(index);
          return (
            <TableRow
              key={row.id}
              data-active={props["data-active"]}
              aria-selected={props["aria-selected"]}
              tabIndex={props.tabIndex}
              data-testid={`client-row-${row.id}`}
              className={cn("cursor-pointer", "data-[active=true]:bg-muted/70")}
              onClick={() =>
                void navigate({
                  to: "/app/clients/$clientId",
                  params: { clientId: row.id },
                })
              }
            >
              <TableCell className="py-1 font-mono text-[13px]">
                {row.code}
              </TableCell>
              <TableCell className="py-1 text-[13px]">{row.name}</TableCell>
              <TableCell className="py-1 text-[13px]">{row.city}</TableCell>
              <TableCell className="py-1 font-mono text-[13px]">
                {row.email ?? "—"}
              </TableCell>
              <TableCell className="py-1 font-mono text-[13px]">
                {row.phone ?? "—"}
              </TableCell>
              <TableCell className="py-1 text-[13px]">
                {row.paymentTermsLabel}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
