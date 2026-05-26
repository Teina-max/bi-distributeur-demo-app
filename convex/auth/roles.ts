export const ORG_ROLES = {
  ADMIN: "admin",
  OPERATOR: "operator",
} as const;

export type OrgRoleValue = (typeof ORG_ROLES)[keyof typeof ORG_ROLES];

export const isAdmin = (role: string | null | undefined): boolean =>
  role === ORG_ROLES.ADMIN;

export const isOperator = (role: string | null | undefined): boolean =>
  role === ORG_ROLES.OPERATOR;
