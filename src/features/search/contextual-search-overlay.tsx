import { useNavigate } from "@tanstack/react-router";
import * as React from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ClientSearchDto } from "@convex/search/dto/clientSearch";
import type { ProductSearchDto } from "@convex/search/dto/productSearch";

import type { OverlayMode, SearchScope } from "./types";
import { useSearchResults } from "./use-search-results";

type Mode = Extract<OverlayMode, "clients" | "products" | "palette">;

type Props = {
  mode: Mode;
  onClose: () => void;
  onSelectClient?: (client: ClientSearchDto) => void;
  onSelectProduct?: (product: ProductSearchDto) => void;
};

const titleFor = (mode: Mode): string => {
  if (mode === "clients") return "Rechercher un client";
  if (mode === "products") return "Rechercher un produit";
  return "Recherche";
};

const scopeFor = (mode: Mode): SearchScope => {
  if (mode === "clients") return "clients";
  if (mode === "products") return "products";
  return "global";
};

const formatPriceHT = (price: number): string => `${price.toFixed(2)} €`;

export function ContextualSearchOverlay({
  mode,
  onClose,
  onSelectClient,
  onSelectProduct,
}: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const { results } = useSearchResults(query, scopeFor(mode));

  const defaultSelectClient = React.useCallback(
    (client: ClientSearchDto) => {
      void navigate({ to: `/app/clients/${client.id}` });
      onClose();
    },
    [navigate, onClose],
  );

  const defaultSelectProduct = React.useCallback(
    (product: ProductSearchDto) => {
      void navigate({ to: `/app/products/${product.id}` });
      onClose();
    },
    [navigate, onClose],
  );

  const handleClientSelect = (client: ClientSearchDto) => {
    (onSelectClient ?? defaultSelectClient)(client);
  };
  const handleProductSelect = (product: ProductSearchDto) => {
    (onSelectProduct ?? defaultSelectProduct)(product);
  };

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const hasQuery = query.trim().length > 0;
  const showClients = mode !== "products";
  const showProducts = mode !== "clients";
  const clientsCount = results.clients.length;
  const productsCount = results.products.length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-xl p-0"
        showCloseButton={false}
        aria-label={titleFor(mode)}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{titleFor(mode)}</DialogTitle>
          <DialogDescription>
            Tapez pour rechercher dans le catalogue.
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="rounded-xl">
          <CommandInput
            placeholder="Tapez pour rechercher..."
            value={query}
            onValueChange={setQuery}
            autoFocus
          />
          <CommandList>
            {!hasQuery ? (
              <div className="text-muted-foreground px-4 py-6 text-center text-sm">
                Tapez pour rechercher
              </div>
            ) : (
              <>
                <CommandEmpty>Aucun résultat</CommandEmpty>
                {showClients && clientsCount > 0 ? (
                  <CommandGroup heading={`Clients (${clientsCount})`}>
                    {results.clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={`client:${client.id}`}
                        onSelect={() => handleClientSelect(client)}
                      >
                        <span className="font-mono">{client.code}</span>
                        <span className="ml-2">{client.name}</span>
                        <span className="text-muted-foreground ml-auto">
                          {client.city}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
                {showClients &&
                showProducts &&
                clientsCount > 0 &&
                productsCount > 0 ? (
                  <CommandSeparator />
                ) : null}
                {showProducts && productsCount > 0 ? (
                  <CommandGroup heading={`Produits (${productsCount})`}>
                    {results.products.map((product) => (
                      <CommandItem
                        key={product.id}
                        value={`product:${product.id}`}
                        onSelect={() => handleProductSelect(product)}
                      >
                        <span className="font-mono">{product.code}</span>
                        <span className="ml-2">{product.name}</span>
                        <span className="text-muted-foreground ml-auto font-mono">
                          {formatPriceHT(product.price_ht)} · stock{" "}
                          {product.stock_qty}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
