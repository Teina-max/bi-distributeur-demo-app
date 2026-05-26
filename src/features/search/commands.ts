import { matchesTokens } from "./match-tokens";
import type { Command } from "./types";

export const COMMANDS: readonly Command[] = [
  {
    id: "new-quotation",
    label: "Nouveau devis",
    to: "/app/quotations/new",
  },
  { id: "list-quotations", label: "Liste devis", to: "/app/quotations" },
  { id: "list-delivery-forms", label: "Liste BL", to: "/app/delivery-forms" },
  {
    id: "new-delivery-form-direct",
    label: "Nouveau BL direct",
    hint: "F2",
    to: "/app/delivery-forms/new",
  },
  { id: "list-invoices", label: "Liste factures", to: "/app/invoices" },
  {
    id: "new-invoice-aggregate",
    label: "Nouvelle facture (agrégée)",
    to: "/app/invoices/new",
  },
  {
    id: "list-purchase-orders",
    label: "Liste BC fournisseurs",
    to: "/app/purchase-orders",
  },
  { id: "list-products", label: "Catalogue produits", to: "/app/products" },
  { id: "list-clients", label: "Clients", to: "/app/clients" },
  {
    id: "insights-bi",
    label: "Tableau de bord BI",
    to: "/app/insights",
  },
  { id: "list-tickets", label: "Tickets SAV", to: "/app/tickets" },
  {
    id: "new-ticket",
    label: "Nouveau ticket SAV",
    to: "/app/tickets/new",
  },
  { id: "sign-out", label: "Se déconnecter", action: "sign-out" },
] as const;

const tokensFor = (command: Command): string[] => {
  const parts = [command.label];
  if (command.hint) parts.push(command.hint);
  return parts;
};

export const filterCommands = (
  commands: readonly Command[],
  query: string,
): Command[] => {
  if (query.trim().length === 0) return commands.slice();
  return commands.filter((c) => matchesTokens(tokensFor(c), query));
};
