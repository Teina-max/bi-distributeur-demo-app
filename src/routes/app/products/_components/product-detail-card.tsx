import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Typography } from "@/components/nowts/typography";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { api } from "@convex/_generated/api";
import type { ProductDetailDto } from "@convex/products/dto/productDetail";
import { useMutation } from "convex/react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { openProductEditDialog } from "./product-edit-dialog";
import { openStockAdjustDialog } from "./product-stock-adjust-dialog";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  product: ProductDetailDto;
  isAdmin: boolean;
};

export function ProductDetailCard({ product, isAdmin }: Props) {
  const toggleActive = useMutation(api.products.mutations.toggleActive);
  const archiveProduct = useMutation(api.products.mutations.archiveProduct);

  const horizonRows: [string, string][] = (
    [
      ["Conditionnement", product.conditioning ?? ""],
      ["Sous-famille", product.subFamily ?? ""],
      ["Code famille", product.familyCode ?? ""],
      ["Réf. fournisseur", product.supplierRef ?? ""],
      ["Code compta vente", product.accountingSaleCode ?? ""],
      ["Code compta achat", product.accountingPurchaseCode ?? ""],
      [
        "Prix achat HT",
        product.purchasePriceHT !== null
          ? `${formatAmount(product.purchasePriceHT)} €`
          : "",
      ],
      [
        "Tarif 2 TTC",
        product.price2TTC !== null
          ? `${formatAmount(product.price2TTC)} €`
          : "",
      ],
      [
        "Tarif 3 TTC",
        product.price3TTC !== null
          ? `${formatAmount(product.price3TTC)} €`
          : "",
      ],
    ] as [string, string][]
  ).filter(([, v]) => v.length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-4">
          <CardTitle className="font-mono text-base">{product.code}</CardTitle>
          <Badge variant={product.isActive ? "default" : "outline"}>
            {product.isActive ? "Actif" : "Inactif"}
          </Badge>
        </div>
        <CardDescription>{product.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Catégorie</dt>
            <dd className="text-[13px]" data-testid="product-detail-category">
              {product.category}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Prix HT</dt>
            <dd
              className="font-mono text-[13px] tabular-nums"
              data-testid="product-detail-price"
            >
              {formatAmount(product.priceHT)} €
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">TVA</dt>
            <dd
              className="font-mono text-[13px] tabular-nums"
              data-testid="product-detail-vat"
            >
              {formatAmount(product.vatRate)} %
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Stock courant</dt>
            <dd
              className="font-mono text-[13px] tabular-nums"
              data-testid="product-detail-stock"
            >
              {product.stockQty}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
            <dt className="text-muted-foreground text-[13px]">Seuil alerte</dt>
            <dd
              className="font-mono text-[13px] tabular-nums"
              data-testid="product-detail-threshold"
            >
              {product.stockThreshold ?? "—"}
            </dd>
          </div>
        </dl>
        {horizonRows.length > 0 ? (
          <dl className="mt-4 grid grid-cols-1 gap-2 border-t pt-4 sm:grid-cols-2">
            {horizonRows.map(([label, value]) => (
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
        {product.description.length > 0 ? (
          <Typography variant="muted" className="mt-4 text-[13px]">
            {product.description}
          </Typography>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openProductEditDialog(product)}
          >
            <Pencil className="size-4" />
            Modifier
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openStockAdjustDialog(product)}
          >
            Ajuster stock
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await toggleActive({ id: product.id });
              toast.success(
                product.isActive ? "Produit désactivé" : "Produit activé",
              );
            }}
          >
            {product.isActive ? "Désactiver" : "Activer"}
          </Button>
          {isAdmin ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                dialogManager.confirm({
                  variant: "destructive",
                  title: "Archiver ce produit ?",
                  description: `Le produit ${product.code} sera masqué du catalogue. Les documents existants ne sont pas affectés.`,
                  confirmText: product.code,
                  action: {
                    label: "Archiver",
                    variant: "destructive",
                    onClick: async () => {
                      await archiveProduct({ id: product.id });
                      toast.success("Produit archivé");
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
