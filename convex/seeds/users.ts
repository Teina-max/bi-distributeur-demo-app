import { internalMutation, mutation } from "../_generated/server";
import { internal } from "@convex/_generated/api";

export const TOSCANA_ORG_ID = "toscana-beverages-demo";

const SEED_USERS = [
  {
    email: "operator@toscana.local",
    name: "Marie-Thé",
    role: "operator" as const,
  },
  { email: "marco@toscana.local", name: "Marco", role: "admin" as const },
  { email: "luca@toscana.local", name: "Luca", role: "admin" as const },
  { email: "teina@toscana.local", name: "Teina", role: "admin" as const },
] as const;

export const TOSCANA_SEED_USERS = SEED_USERS;

export const ensureUsers = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ seeded: number; existing: number }> => {
    const results = await Promise.all(
      SEED_USERS.map(async (target) => {
        const found = await ctx.db
          .query("user_preferences")
          .withIndex("by_organization_and_user", (q) =>
            q
              .eq("organization_id", TOSCANA_ORG_ID)
              .eq("user_id", target.email),
          )
          .unique();
        if (found === null) {
          await ctx.db.insert("user_preferences", {
            organization_id: TOSCANA_ORG_ID,
            user_id: target.email,
            default_vat_rate: 20,
            ui_density: "compact",
            recent_client_ids: [],
            recent_product_ids: [],
          });
          return "seeded" as const;
        }
        return "existing" as const;
      }),
    );
    const seeded = results.filter((r) => r === "seeded").length;
    const existing = results.filter((r) => r === "existing").length;
    return { seeded, existing };
  },
});

// POC wrapper — allows seeding from external scripts via ConvexHttpClient.
// Not protected by auth; acceptable for local dev seeding only.
export const ensureUsersPublic = mutation({
  args: {},
  handler: async (ctx): Promise<{ seeded: number; existing: number }> => {
    return ctx.runMutation(internal.seeds.users.ensureUsers, {});
  },
});
