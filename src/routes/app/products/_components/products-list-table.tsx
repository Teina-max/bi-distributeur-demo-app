import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
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
import type { ProductListItemDto } from "@convex/products/dto/productListItem";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Row = Omit<ProductListItemDto, "id"> & { id: string };

type Props = {
  items: readonly ProductListItemDto[];
};

export function ProductsListTable({ items }: Props) {
  const navigate = useNavigate();

  const rows: Row[] = items.map((item) => ({ ...item, id: String(item.id) }));

  const { getRowProps } = useTableKeyboardNav<Row>(rows, {
    scopeId: "products-list",
    onActivate: (row) =>
      void navigate({
        to: "/app/products/$productId",
        params: { productId: row.id },
      }),
  });

  if (rows.length === 0) {
    return (
      <Typography variant="muted" className="text-[13px]">
        Aucun produit trouvé.
      </Typography>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-1 text-[13px]">Code</TableHead>
          <TableHead className="py-1 text-[13px]">Désignation</TableHead>
          <TableHead className="py-1 text-[13px]">Catégorie</TableHead>
          <TableHead className="py-1 text-right text-[13px]">Prix HT</TableHead>
          <TableHead className="py-1 text-right text-[13px]">TVA</TableHead>
          <TableHead className="py-1 text-right text-[13px]">Stock</TableHead>
          <TableHead className="py-1 text-[13px]">Actif</TableHead>
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
              data-testid={`product-row-${row.id}`}
              className={cn("cursor-pointer", "data-[active=true]:bg-muted/70")}
              onClick={() =>
                void navigate({
                  to: "/app/products/$productId",
                  params: { productId: row.id },
                })
              }
            >
              <TableCell className="py-1 font-mono text-[13px]">
                {row.code}
              </TableCell>
              <TableCell className="py-1 text-[13px]">{row.name}</TableCell>
              <TableCell className="py-1 text-[13px]">{row.category}</TableCell>
              <TableCell className="py-1 text-right font-mono text-[13px] tabular-nums">
                {formatAmount(row.priceHT)} €
              </TableCell>
              <TableCell className="py-1 text-right font-mono text-[13px] tabular-nums">
                {formatAmount(row.vatRate)} %
              </TableCell>
              <TableCell className="py-1 text-right font-mono text-[13px] tabular-nums">
                {row.stockQty}
              </TableCell>
              <TableCell className="py-1 text-[13px]">
                <Badge variant={row.isActive ? "default" : "outline"}>
                  {row.isActive ? "Oui" : "Non"}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
