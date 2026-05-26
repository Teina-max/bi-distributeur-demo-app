import { v } from "convex/values";
import { APIError } from "better-auth";
import { components, internal } from "../_generated/api";
import { mutation, type MutationCtx } from "../_generated/server";
import { findOrganizationById } from "@convex/auth/helpers";
import { authComponent, createAuth, siteUrl } from "./config";
import { buildMemberRemovedEmail } from "./emailTemplates";
import { orgMutation } from "./functions";
import {
  throwForbidden,
  throwUnauthorized,
  throwValidationError,
} from "@convex/utils/errors";

const POC_ORGANIZATION_NAME = "Toscana Beverages SARL";

type RunQueryCtx = Pick<MutationCtx, "runQuery">;

type EnsureBetterAuthOrgMembershipParams = {
  auth: ReturnType<typeof createAuth>;
  headers: Headers;
  userId: string;
  organizationIdOrSlug: string;
  organizationName: string;
};

// POC bypass forwards the slug `toscana-beverages-demo` as `organizationId` —
// Better Auth's createInvitation expects the internal `_id`. Resolve the slug
// to a real BA org (creating it if absent) and ensure the caller has a member
// row so BA's MEMBER_NOT_FOUND / ORGANIZATION_NOT_FOUND checks pass.
export async function ensureBetterAuthOrgMembership(
  ctx: RunQueryCtx,
  params: EnsureBetterAuthOrgMembershipParams,
): Promise<string> {
  const { auth, headers, userId, organizationIdOrSlug, organizationName } =
    params;

  const org =
    (await ctx.runQuery(components.betterAuth.data.getOrganizationBySlug, {
      slug: organizationIdOrSlug,
    })) ??
    (await ctx.runQuery(components.betterAuth.data.getOrganizationById, {
      organizationId: organizationIdOrSlug,
    }));

  if (!org) {
    const created = await auth.api.createOrganization({
      body: {
        name: organizationName,
        slug: organizationIdOrSlug,
      },
      headers,
    });

    if (!created.id) {
      throw new Error("Failed to create Better Auth organization");
    }

    return String(created.id);
  }

  const realOrganizationId = String(org._id);

  const existingMember = await ctx.runQuery(
    components.betterAuth.data.getMemberByOrganizationAndUser,
    { organizationId: realOrganizationId, userId },
  );

  if (!existingMember) {
    await auth.api.addMember({
      body: {
        userId,
        organizationId: realOrganizationId,
        role: "owner",
      },
      headers,
    });
  }

  return realOrganizationId;
}

const throwAuthApiError = (error: unknown): never => {
  if (error instanceof APIError) {
    const message =
      typeof error.body?.message === "string" && error.body.message
        ? error.body.message
        : error.message;

    if (error.statusCode === 401) {
      throwUnauthorized(message);
    }

    if (error.statusCode === 403) {
      throwForbidden(message);
    }

    throwValidationError(message);
  }

  throw error;
};

export const inviteMember = orgMutation({
  roles: ["owner", "admin"],
  args: {
    email: v.string(),
    role: v.union(v.literal("member"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    try {
      const realOrganizationId = await ensureBetterAuthOrgMembership(ctx, {
        auth,
        headers,
        userId: String(ctx.orgAuth.session.user.id),
        organizationIdOrSlug: args.organizationId,
        organizationName: POC_ORGANIZATION_NAME,
      });

      return await auth.api.createInvitation({
        body: {
          organizationId: realOrganizationId,
          email: args.email,
          role: args.role,
        },
        headers,
      });
    } catch (error) {
      throwAuthApiError(error);
    }
  },
});

export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    try {
      return await auth.api.createOrganization({
        body: {
          name: args.name,
          slug: args.slug,
        },
        headers,
      });
    } catch (error) {
      throwAuthApiError(error);
    }
  },
});

export const checkOrganizationSlug = mutation({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    try {
      return await auth.api.checkOrganizationSlug({
        body: {
          slug: args.slug,
        },
        headers,
      });
    } catch (error) {
      throwAuthApiError(error);
    }
  },
});

export const acceptInvitation = mutation({
  args: { invitationId: v.string() },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const result = await auth.api.acceptInvitation({
      body: { invitationId: args.invitationId },
      headers,
    });

    const organizationId = result.member.organizationId;
    if (!organizationId) {
      return { ...result, organizationSlug: null as string | null };
    }

    const organization = await findOrganizationById(
      ctx,
      String(organizationId),
    );

    return {
      ...result,
      organizationSlug: (organization?.slug as string | null) ?? null,
    };
  },
});

export const rejectInvitation = mutation({
  args: { invitationId: v.string() },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    return auth.api.rejectInvitation({
      body: { invitationId: args.invitationId },
      headers,
    });
  },
});

export const cancelInvitation = orgMutation({
  roles: ["owner", "admin"],
  args: { invitationId: v.string() },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    return auth.api.cancelInvitation({
      body: { invitationId: args.invitationId },
      headers,
    });
  },
});

export const removeMember = orgMutation({
  roles: ["owner", "admin"],
  args: { memberIdOrEmail: v.string() },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    const memberRow = await ctx
      .runQuery(components.betterAuth.data.getMemberById, {
        memberId: args.memberIdOrEmail,
      })
      .catch(() => null);

    const userRow = await ctx
      .runQuery(
        memberRow?.userId
          ? components.betterAuth.data.getUserById
          : components.betterAuth.data.getUserByEmail,
        memberRow?.userId
          ? { userId: String(memberRow.userId) }
          : { email: args.memberIdOrEmail },
      )
      .catch(() => null);

    const orgRow = await findOrganizationById(ctx, args.organizationId).catch(
      () => null,
    );

    const result = await auth.api.removeMember({
      body: {
        organizationId: args.organizationId,
        memberIdOrEmail: args.memberIdOrEmail,
      },
      headers,
    });

    const removedEmail = userRow?.email ? String(userRow.email) : null;
    const orgName = orgRow?.name ? String(orgRow.name) : null;

    if (removedEmail && orgName) {
      await ctx.scheduler.runAfter(
        0,
        internal.email.actions.sendMarkdownEmail,
        {
          to: removedEmail,
          subject: `You have been removed from ${orgName}`,
          ...buildMemberRemovedEmail({
            orgName,
            orgLogo: orgRow?.logo ? String(orgRow.logo) : null,
            userName: userRow?.name ? String(userRow.name) : "",
            appUrl: siteUrl,
          }),
        },
      );
    }

    return result;
  },
});

export const updateMemberRole = orgMutation({
  roles: ["owner", "admin"],
  args: {
    memberId: v.string(),
    role: v.union(v.literal("member"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    return auth.api.updateMemberRole({
      body: {
        organizationId: args.organizationId,
        memberId: args.memberId,
        role: args.role,
      },
      headers,
    });
  },
});

export const signOut = mutation({
  args: {},
  handler: async (ctx) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.signOut({ headers });
  },
});

export const updateOrganization = orgMutation({
  roles: ["owner", "admin"],
  args: {
    data: v.object({
      name: v.optional(v.string()),
      slug: v.optional(v.string()),
      logo: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    const authData: {
      name?: string;
      slug?: string;
      logo?: string;
    } = {};

    if (args.data.name !== undefined) {
      authData.name = args.data.name;
    }

    if (args.data.slug !== undefined) {
      authData.slug = args.data.slug;
    }

    if (typeof args.data.logo === "string") {
      authData.logo = args.data.logo;
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    let updatedOrganization =
      Object.keys(authData).length > 0
        ? await auth.api.updateOrganization({
            body: {
              organizationId: args.organizationId,
              data: authData,
            },
            headers,
          })
        : null;

    if (args.data.logo === null) {
      updatedOrganization = await ctx.runMutation(
        components.betterAuth.data.patchOrganization,
        {
          organizationId: args.organizationId,
          update: { logo: null },
        },
      );
    }

    return updatedOrganization;
  },
});

export const deleteOrganization = orgMutation({
  permission: { organization: ["delete"] },
  args: {},
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    return auth.api.deleteOrganization({
      body: {
        organizationId: args.organizationId,
      },
      headers,
    });
  },
});

export const setOrgStripeCustomerId = orgMutation({
  roles: ["owner", "admin"],
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(components.betterAuth.data.patchOrganization, {
      organizationId: args.organizationId,
      update: { stripeCustomerId: args.stripeCustomerId },
    });
  },
});

export const setPassword = mutation({
  args: {
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    return auth.api.setPassword({
      body: {
        newPassword: args.newPassword,
      },
      headers,
    });
  },
});
