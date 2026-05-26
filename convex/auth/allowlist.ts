// POC perimeter — Toscana mono-org standalone ERP.
// TODO V2 (real multi-tenant): remove this allowlist and rely on Better Auth
// organization invitations + membership. Until then, only the listed emails
// can sign in and reach the Toscana Beverages SARL data (cf. orgAccess.ts POC bypass +
// config.ts user.create.after hook).
export const POC_ALLOWLIST: ReadonlySet<string> = new Set([
  // Production accounts (Toscana Beverages SARL + Teina super-admin)
  "marco@ladinguerie.fr",
  "luca@ladinguerie.fr",
  "maetiaore@gmail.com",
  "teinateinauri@gmail.com",
  // Seed accounts for the @toscana.local convention used by Phase 0 fixtures.
  "operator@toscana.local",
  "marco@toscana.local",
  "luca@toscana.local",
  "teina@toscana.local",
]);

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return POC_ALLOWLIST.has(normalized);
}
