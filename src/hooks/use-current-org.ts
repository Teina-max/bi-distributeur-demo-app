import { create } from "zustand";

type CurrentOrgSubscription = {
  id: string;
  referenceId: string;
  plan: string;
  status: string | null;
  periodStart: number | null;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  discount: Record<string, unknown> | null;
  overrideLimits: Record<string, Record<string, number>> | null;
  createdAt: number;
  updatedAt: number;
};

type CurrentOrgStore = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  subscription: CurrentOrgSubscription | null;
};

/**
 * Client-side hook to access the current organization context.
 *
 * This is the canonical way to get org data in client components.
 * Do NOT use better-auth's useActiveOrganization - use this instead.
 *
 * The org data is injected server-side via OrgProvider in the layout.
 *
 * @example
 * ```tsx
 * export const ClientComponent = () => {
 *   const currentOrg = useCurrentOrg();
 *
 *   if (!currentOrg) return null;
 *
 *   return <p>Current org: {currentOrg.name}</p>;
 * };
 * ```
 */
export const useCurrentOrg = create<CurrentOrgStore | null>(() => null);

export type CurrentOrgData = CurrentOrgStore;

export const setCurrentOrg = (org: CurrentOrgData) => {
  useCurrentOrg.setState({
    id: org.id,
    slug: org.slug,
    name: org.name,
    image: org.image,
    subscription: org.subscription,
  });
};

export const clearCurrentOrg = () => {
  useCurrentOrg.setState(null);
};
