import { v } from "convex/values";
import { components } from "@convex/_generated/api";
import type { QueryCtx } from "@convex/_generated/server";
import { adminQuery } from "@convex/auth/functions";
import {
  findOrganizationById,
  MAX_LIST_MEMBERS,
  MAX_USER_MEMBERSHIPS,
  getOrganizationInvitations,
  getOrganizationMembers,
} from "@convex/auth/helpers";
import {
  MAX_ADMIN_LIST_ORGANIZATIONS,
  MAX_ADMIN_LIST_USERS,
  findUserById,
  loadUserWithMemberships,
} from "@convex/admin/helpers";
import { toAdminAccountDto } from "@convex/admin/dto/account";
import { toAdminOrganizationDto } from "@convex/admin/dto/organization";
import { toAdminSessionDto } from "@convex/admin/dto/session";
import { toAdminUserDto } from "@convex/admin/dto/user";
import type { Doc as AuthDoc } from "@convex/betterAuth/_generated/dataModel";

const DASHBOARD_MONTH_COUNT = 6;

function getPageStart(page: number, pageSize: number) {
  return (Math.max(page, 1) - 1) * pageSize;
}

function getPage<T>(items: T[], page: number, pageSize: number) {
  const start = getPageStart(page, pageSize);
  return items.slice(start, start + pageSize);
}

function getTotalPages(total: number, pageSize: number) {
  return Math.ceil(total / pageSize);
}

function getDashboardMonths() {
  const months: { key: string; start: number; end: number }[] = [];
  const now = new Date();

  for (let i = DASHBOARD_MONTH_COUNT - 1; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    months.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      start: start.getTime(),
      end: end.getTime(),
    });
  }

  return months;
}

async function loadOrganizationsByPage(
  ctx: QueryCtx,
  opts: {
    limit: number;
    sort: "asc" | "desc";
    search?: string;
    plan?: string;
  },
) {
  const organizationsResult = await ctx.runQuery(
    components.betterAuth.data.listOrganizationsForAdmin,
    {
      limit: opts.limit,
      sort: opts.sort,
      search: opts.search,
    },
  );
  return (organizationsResult ?? []) as AuthDoc<"organization">[];
}

export const listUsers = adminQuery({
  args: {
    page: v.number(),
    pageSize: v.number(),
    search: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    status: v.optional(v.union(v.literal("active"), v.literal("banned"))),
    sort: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const sortDirection = args.sort ?? "desc";
    const usersResult = await ctx.runQuery(
      components.betterAuth.data.listUsersForAdmin,
      {
        limit: MAX_ADMIN_LIST_USERS,
        sort: sortDirection,
        search: args.search,
        role: args.role,
        status: args.status,
      },
    );
    const users = ((usersResult ?? []) as AuthDoc<"user">[]).map(
      toAdminUserDto,
    );

    const total = users.length;

    return {
      users: getPage(users, args.page, args.pageSize),
      total,
      totalPages: getTotalPages(total, args.pageSize),
    };
  },
});

export const getUserById = adminQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await findUserById(ctx, args.userId);
    if (!user) return null;

    const [members, accountsResult, sessionsResult] = await Promise.all([
      loadUserWithMemberships(ctx, args.userId),
      ctx.runQuery(components.betterAuth.data.listAccountsByUser, {
        userId: args.userId,
        limit: MAX_USER_MEMBERSHIPS,
      }),
      ctx.runQuery(components.betterAuth.data.listSessionsByUser, {
        userId: args.userId,
        limit: MAX_USER_MEMBERSHIPS,
      }),
    ]);

    const accounts = ((accountsResult ?? []) as AuthDoc<"account">[]).map(
      toAdminAccountDto,
    );

    const sessions = ((sessionsResult ?? []) as AuthDoc<"session">[]).map(
      toAdminSessionDto,
    );

    return {
      ...user,
      members,
      accounts,
      sessions,
    };
  },
});

export const listUserSessions = adminQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const sessionsResult = await ctx.runQuery(
      components.betterAuth.data.listSessionsByUser,
      {
        userId: args.userId,
        limit: MAX_USER_MEMBERSHIPS,
      },
    );

    return ((sessionsResult ?? []) as AuthDoc<"session">[]).map(
      toAdminSessionDto,
    );
  },
});

export const listOrganizations = adminQuery({
  args: {
    page: v.number(),
    pageSize: v.number(),
    search: v.optional(v.string()),
    plan: v.optional(v.string()),
    sort: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const sortDirection = args.sort ?? "desc";
    const rawOrganizations = await loadOrganizationsByPage(ctx, {
      limit: MAX_ADMIN_LIST_ORGANIZATIONS,
      sort: sortDirection,
      search: args.search,
      plan: args.plan,
    });

    const pageOrganizations = getPage(
      rawOrganizations,
      args.page,
      args.pageSize,
    );

    const organizations = pageOrganizations.map((organization) => {
      const mappedOrganization = toAdminOrganizationDto(organization);
      return {
        ...mappedOrganization,
        subscription: null,
        plan: "free",
      };
    });

    const organizationsWithMembers = await Promise.all(
      organizations.map(async (organization) => {
        const membersResult = await ctx.runQuery(
          components.betterAuth.data.listMembersByOrganization,
          {
            organizationId: organization.id,
            limit: MAX_LIST_MEMBERS,
          },
        );

        return {
          ...organization,
          _count: {
            members: (membersResult ?? []).length,
          },
        };
      }),
    );

    return {
      organizations: organizationsWithMembers,
      total: rawOrganizations.length,
      totalPages: getTotalPages(rawOrganizations.length, args.pageSize),
    };
  },
});

export const getOrganizationById = adminQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const org = await findOrganizationById(ctx, args.organizationId);
    if (!org) return null;

    const [members, invitations] = await Promise.all([
      getOrganizationMembers(ctx, args.organizationId),
      getOrganizationInvitations(ctx, args.organizationId),
    ]);

    return {
      id: String(org._id),
      name: String(org.name),
      slug: String(org.slug ?? ""),
      logo: (org.logo as string | null) ?? null,
      createdAt: Number(new Date(org.createdAt).getTime()),
      stripeCustomerId: (org.stripeCustomerId as string | null) ?? null,
      members,
      invitations,
      subscription: null,
    };
  },
});

export const getDashboard = adminQuery({
  args: {},
  handler: async (ctx) => {
    const { auth, headers } = ctx.adminAuth;
    const [organizationsResult, usersResult] = await Promise.all([
      ctx.runQuery(components.betterAuth.data.listOrganizationsForAdmin, {
        limit: MAX_ADMIN_LIST_ORGANIZATIONS,
        sort: "asc",
      }),
      auth.api.listUsers({
        headers,
        query: {
          limit: MAX_ADMIN_LIST_USERS,
          sortBy: "createdAt",
          sortDirection: "asc",
        },
      }),
    ]);

    const months = getDashboardMonths();
    const sortedUserCreatedAt = usersResult.users.map((user) =>
      Number(new Date(user.createdAt).getTime()),
    );

    let userCursor = 0;
    let userMonthStart = 0;
    const userGrowth = months.map((month) => {
      while (
        userMonthStart < sortedUserCreatedAt.length &&
        sortedUserCreatedAt[userMonthStart] < month.start
      ) {
        userMonthStart += 1;
      }
      while (
        userCursor < sortedUserCreatedAt.length &&
        sortedUserCreatedAt[userCursor] < month.end
      ) {
        userCursor += 1;
      }
      return {
        date: month.key,
        count: userCursor - userMonthStart,
        total: userCursor,
      };
    });

    const mrrHistory = months.map((month) => ({
      date: month.key,
      mrr: 0,
    }));

    return {
      totalOrgs: (organizationsResult ?? []).length,
      totalUsers: usersResult.users.length,
      premiumOrgs: 0,
      mrrInCents: 0,
      mrrHistory,
      userGrowth,
    };
  },
});
