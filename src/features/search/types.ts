export type CommandAction = "sign-out";

export type Command = {
  id: string;
  label: string;
  hint?: string;
  to?: string;
  action?: CommandAction;
};

export type OverlayMode =
  | "closed"
  | "palette"
  | "clients"
  | "products"
  | "help";

export type SearchScope = "clients" | "products" | "global";
