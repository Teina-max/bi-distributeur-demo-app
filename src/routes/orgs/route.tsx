import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

// POC Toscana Beverages SARL mono-tenant: hide org browsing (/orgs, /orgs/list, /orgs/new)
// behind a redirect to /app. Two explicit carve-outs:
// - /orgs/accept-invitation/* so future invitations stay redeemable.
// - /orgs/toscana-beverages-demo/settings/* so admins can manage members
//   (the sidebar's "Organisation" link points here).
const POC_ORG_SLUG = "toscana-beverages-demo";
const allowedPrefixes = [
  "/orgs/accept-invitation",
  `/orgs/${POC_ORG_SLUG}/settings`,
];

export const Route = createFileRoute("/orgs")({
  beforeLoad: ({ location }) => {
    if (allowedPrefixes.some((prefix) => location.pathname.startsWith(prefix))) {
      return;
    }
    throw redirect({ to: "/app", replace: true });
  },
  component: () => <Outlet />,
  pendingComponent: () => null,
});
