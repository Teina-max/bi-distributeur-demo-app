import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";
import type { MutationCtx } from "@convex/_generated/server";
import { ensureBetterAuthOrgMembership } from "../mutations";

const ORG_SLUG = "toscana-beverages-demo";
const REAL_ORG_ID = "ba_org_abc123";
const USER_ID = "user_xyz";
const ORG_NAME = "Toscana Beverages SARL";

type EnsureParams = Parameters<typeof ensureBetterAuthOrgMembership>[1];
type AuthLike = EnsureParams["auth"];

function makeAuth(): AuthLike {
  return {
    api: {
      createOrganization: vi.fn(),
      addMember: vi.fn(),
    },
  } as unknown as AuthLike;
}

function makeCtx() {
  const runQuery = vi.fn();
  return {
    ctx: { runQuery } as unknown as Pick<MutationCtx, "runQuery">,
    runQuery,
  };
}

const baseParams = (auth: AuthLike): EnsureParams => ({
  auth,
  headers: new Headers(),
  userId: USER_ID,
  organizationIdOrSlug: ORG_SLUG,
  organizationName: ORG_NAME,
});

describe("ensureBetterAuthOrgMembership", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns real id when org and member already exist", async () => {
    const { ctx, runQuery } = makeCtx();
    runQuery
      .mockResolvedValueOnce({
        _id: REAL_ORG_ID,
        slug: ORG_SLUG,
        name: ORG_NAME,
      })
      .mockResolvedValueOnce({
        _id: "m_1",
        userId: USER_ID,
        organizationId: REAL_ORG_ID,
        role: "owner",
      });
    const auth = makeAuth();

    const realId = await ensureBetterAuthOrgMembership(ctx, baseParams(auth));

    expect(realId).toBe(REAL_ORG_ID);
    expect(runQuery).toHaveBeenCalledTimes(2);
    expect(auth.api.createOrganization).not.toHaveBeenCalled();
    expect(auth.api.addMember).not.toHaveBeenCalled();
  });

  test("creates org via auth.api.createOrganization when slug + id lookups both miss", async () => {
    const { ctx, runQuery } = makeCtx();
    runQuery.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const auth = makeAuth();
    (auth.api.createOrganization as unknown as Mock).mockResolvedValueOnce({
      id: "ba_new_org",
    });

    const realId = await ensureBetterAuthOrgMembership(ctx, baseParams(auth));

    expect(realId).toBe("ba_new_org");
    expect(auth.api.createOrganization).toHaveBeenCalledTimes(1);
    expect(auth.api.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { name: ORG_NAME, slug: ORG_SLUG },
      }),
    );
    expect(auth.api.addMember).not.toHaveBeenCalled();
  });

  test("adds caller as owner when org exists but member row is missing", async () => {
    const { ctx, runQuery } = makeCtx();
    runQuery
      .mockResolvedValueOnce({
        _id: REAL_ORG_ID,
        slug: ORG_SLUG,
        name: ORG_NAME,
      })
      .mockResolvedValueOnce(null);
    const auth = makeAuth();
    (auth.api.addMember as unknown as Mock).mockResolvedValueOnce({
      id: "m_new",
    });

    const realId = await ensureBetterAuthOrgMembership(ctx, baseParams(auth));

    expect(realId).toBe(REAL_ORG_ID);
    expect(auth.api.addMember).toHaveBeenCalledTimes(1);
    expect(auth.api.addMember).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          userId: USER_ID,
          organizationId: REAL_ORG_ID,
          role: "owner",
        },
      }),
    );
    expect(auth.api.createOrganization).not.toHaveBeenCalled();
  });

  test("throws when createOrganization returns no id", async () => {
    const { ctx, runQuery } = makeCtx();
    runQuery.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const auth = makeAuth();
    (auth.api.createOrganization as unknown as Mock).mockResolvedValueOnce({
      id: null,
    });

    await expect(
      ensureBetterAuthOrgMembership(ctx, baseParams(auth)),
    ).rejects.toThrow("Failed to create Better Auth organization");
  });

  test("falls back to getOrganizationById when slug lookup misses but id matches", async () => {
    const { ctx, runQuery } = makeCtx();
    runQuery
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        _id: REAL_ORG_ID,
        slug: ORG_SLUG,
        name: ORG_NAME,
      })
      .mockResolvedValueOnce({
        _id: "m_1",
        userId: USER_ID,
        organizationId: REAL_ORG_ID,
        role: "owner",
      });
    const auth = makeAuth();

    const realId = await ensureBetterAuthOrgMembership(ctx, {
      ...baseParams(auth),
      organizationIdOrSlug: REAL_ORG_ID,
    });

    expect(realId).toBe(REAL_ORG_ID);
    expect(runQuery).toHaveBeenCalledTimes(3);
    expect(auth.api.createOrganization).not.toHaveBeenCalled();
    expect(auth.api.addMember).not.toHaveBeenCalled();
  });
});
