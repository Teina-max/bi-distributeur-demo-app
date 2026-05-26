import { components } from "@convex/_generated/api";
import type {
  ActionCtx,
  MutationCtx,
  QueryCtx,
} from "@convex/_generated/server";
import { isAllowedEmail } from "@convex/auth/allowlist";
import type { AuthPermission } from "@convex/auth/permissions";
import { authComponent, createAuth, requireAuth } from "@convex/auth/config";
import {
  throwForbidden,
  throwNotFound,
  throwValidationError,
} from "@convex/utils/errors";

export type OrgRole = "owner" | "admin" | "member";

export type OrgAuth = Awaited<ReturnType<typeof requireOrganizationMember>>;

type RequireOrganizationMemberOptions = {
  allowPlatformAdmin?: boolean;
};

type OrganizationReference = {
  organizationId?: string;
  organizationSlug?: string;
};

// POC bypass — Toscana mono-org standalone ERP.
// TODO V2 (real multi-tenant): remove this branch and switch back to the
// standard Better Auth membership path. Phase 0 seeds (clients, products,
// quotations, ...) all carry organization_id = "toscana-beverages-demo" (slug),
// and Better Auth's user.create.after hook would otherwise return a random BA
// _id that never matches our seeds. Until V2 is on, EVERY authenticated user
// is granted the same POC organizationId — magic-link auth gates who can
// reach the app, so any signed-in user is an admin/member of Toscana Beverages SARL.
const POC_TOSCANA_ORG_SLUG = "toscana-beverages-demo";
const POC_PREPARATRICE_EMAIL = "operator@toscana.local";

// Only allowlisted emails (cf. convex/auth/allowlist.ts) join the Toscana Beverages SARL
// POC org. Better Auth's user.create.after hook rejects non-allowlisted
// emails up front, so this check is a defense-in-depth backstop.
const isPocSarlDefiUser = (email: string | null | undefined): boolean => {
  return isAllowedEmail(email);
};

const splitRoles = (role: string | null | undefined) =>
  (role ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const roleMatches = (
  role: string | null | undefined,
  roles: readonly OrgRole[],
) => {
  const memberRoles = splitRoles(role);
  if (memberRoles.includes("owner")) return true;
  return roles.some((requiredRole) => memberRoles.includes(requiredRole));
};

export async function requireOrganizationMember(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  organizationId: string,
  options: RequireOrganizationMemberOptions = {},
) {
  const { auth, headers, session } = await requireAuth(ctx);
  const isPlatformAdmin = (session.user as { role?: string }).role === "admin";

  if (isPlatformAdmin && options.allowPlatformAdmin !== false) {
    return {
      auth,
      headers,
      session,
      member: null,
      isPlatformAdmin,
      organizationId,
    };
  }

  const member = await ctx.runQuery(
    components.betterAuth.data.getMemberByOrganizationAndUser,
    {
      organizationId,
      userId: session.user.id,
    },
  );

  if (!member) {
    throwForbidden();
  }

  return {
    auth,
    headers,
    session,
    isPlatformAdmin,
    organizationId,
    member: {
      id: String(member._id),
      organizationId: String(member.organizationId),
      userId: String(member.userId),
      role: String(member.role),
    },
  };
}

export async function requireOrganizationAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  organization: OrganizationReference,
  options: RequireOrganizationMemberOptions = {},
) {
  // POC bypass — see top-of-file comment. Every *@toscana.local user resolves
  // to organizationId = "toscana-beverages-demo" (slug literal), so orgQuery /
  // orgMutation handlers receive an id that matches the Phase 0 seeds.
  const pocAuth = await requireAuth(ctx);
  if (isPocSarlDefiUser(pocAuth.session.user.email)) {
    return {
      auth: pocAuth.auth,
      headers: pocAuth.headers,
      session: pocAuth.session,
      isPlatformAdmin: false,
      organizationId: POC_TOSCANA_ORG_SLUG,
      member: {
        id: `poc-${String(pocAuth.session.user.id)}`,
        organizationId: POC_TOSCANA_ORG_SLUG,
        userId: String(pocAuth.session.user.id),
        role:
          pocAuth.session.user.email === POC_PREPARATRICE_EMAIL
            ? "member"
            : "admin",
      },
    };
  }

  if (organization.organizationId) {
    return requireOrganizationMember(ctx, organization.organizationId, options);
  }

  if (!organization.organizationSlug) {
    throwValidationError("organizationId or organizationSlug is required");
  }

  const { auth, headers, session } = await requireAuth(ctx);
  const isPlatformAdmin = (session.user as { role?: string }).role === "admin";

  if (isPlatformAdmin && options.allowPlatformAdmin !== false) {
    const org = await ctx.runQuery(
      components.betterAuth.data.getOrganizationBySlug,
      { slug: organization.organizationSlug },
    );

    if (!org) {
      throwNotFound("Organization not found");
    }

    return {
      auth,
      headers,
      session,
      member: null,
      isPlatformAdmin,
      organizationId: String(org._id),
    };
  }

  const org = await auth.api.getFullOrganization({
    headers,
    query: { organizationSlug: organization.organizationSlug },
  });

  if (!org) {
    throwForbidden();
  }

  const member = org.members.find(
    (candidate) => candidate.userId === session.user.id,
  );

  if (!member) {
    throwForbidden();
  }

  return {
    auth,
    headers,
    session,
    isPlatformAdmin,
    organizationId: String(org.id),
    member: {
      id: String(member.id),
      organizationId: String(org.id),
      userId: String(member.userId),
      role: String(member.role),
    },
  };
}

export function requireOrgRole(orgAuth: OrgAuth, roles: readonly OrgRole[]) {
  if (orgAuth.isPlatformAdmin) return;
  if (!roleMatches(orgAuth.member.role, roles)) {
    throwForbidden();
  }
}

export async function requireOrgPermission(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  orgAuth: OrgAuth,
  organizationId: string,
  permission: AuthPermission,
) {
  if (orgAuth.isPlatformAdmin) return;

  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const permissionResult = await auth.api.hasPermission({
    headers,
    body: { permissions: permission, organizationId },
  } as unknown as Parameters<typeof auth.api.hasPermission>[0]);

  if (!permissionResult.success) {
    throwForbidden();
  }
}
