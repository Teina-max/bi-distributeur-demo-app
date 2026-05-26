export type ClientStatus =
  | "new"
  | "top"
  | "regular"
  | "occasional"
  | "dormant"
  | "lost";

export type ClientStatusInput = {
  last_invoice_at: number | null;
  ca_12m_ht: number;
  total_invoices: number;
  now?: number;
};

// Seuils tirés des verbatims terrain Toscana Beverages SARL (Méditerranée, HORECA saisonnier).
// Ajustables ici sans toucher aux queries.
const TOP_CA_12M_HT = 5000;
const REGULAR_DAYS = 90;
const OCCASIONAL_DAYS = 180;
const DORMANT_DAYS = 540;

const DAY_MS = 24 * 60 * 60 * 1000;

export const computeClientStatus = (input: ClientStatusInput): ClientStatus => {
  if (input.total_invoices === 0 || input.last_invoice_at === null)
    return "new";
  const now = input.now ?? Date.now();
  const days = Math.floor((now - input.last_invoice_at) / DAY_MS);
  if (input.ca_12m_ht >= TOP_CA_12M_HT && days <= OCCASIONAL_DAYS) return "top";
  if (days <= REGULAR_DAYS) return "regular";
  if (days <= OCCASIONAL_DAYS) return "occasional";
  if (days <= DORMANT_DAYS) return "dormant";
  return "lost";
};
