// POC perimeter — Toscana demo public.
// En mode DEMO_MODE=true (cf. Convex env), tout email signin est autorise et auto-mappe a l'org demo.
// Sinon, seul l'allowlist est autorise (utile en local dev sans demo flag).
export const POC_ALLOWLIST: ReadonlySet<string> = new Set([
  // Comptes seed pour le tenant demo (cohérents avec convex/seeds/users.ts).
  "operator@toscana.local",
  "marco@toscana.local",
  "luca@toscana.local",
  "teina@toscana.local",
  "demo@toscana.local",
]);

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) return false;
  // Demo mode: tout email valide passe (le public peut tester avec son propre email).
  if (process.env.DEMO_MODE === "true") {
    return true;
  }
  return POC_ALLOWLIST.has(normalized);
}
