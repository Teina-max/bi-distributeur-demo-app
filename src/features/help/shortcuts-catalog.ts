export type ShortcutEntry = {
  id: string;
  shortcut: string;
  action: string;
  scope: string;
};

export const SHORTCUTS_CATALOG: readonly ShortcutEntry[] = [
  { id: "f1", shortcut: "F1", action: "Aide contextuelle", scope: "Global" },
  { id: "f2", shortcut: "F2", action: "Nouveau BL direct", scope: "Global" },
  {
    id: "f3",
    shortcut: "F3",
    action: "Recherche contextuelle",
    scope: "Global",
  },
  { id: "f4", shortcut: "F4", action: "Télécharger PDF", scope: "Document" },
  { id: "f5", shortcut: "F5", action: "Rafraîchir", scope: "Global" },
  { id: "f6", shortcut: "F6", action: "Marquer envoyée", scope: "Facture" },
  { id: "f7", shortcut: "F7", action: "Marquer payée", scope: "Facture" },
  { id: "f8", shortcut: "F8", action: "Convertir devis → BL", scope: "Devis" },
  { id: "f9", shortcut: "F9", action: "Convertir BL → facture", scope: "BL" },
  { id: "f10", shortcut: "F10", action: "Menu", scope: "Global" },
  {
    id: "ctrl-k",
    shortcut: "Ctrl+K",
    action: "Palette de commandes",
    scope: "Global",
  },
  {
    id: "ctrl-s",
    shortcut: "Ctrl+S",
    action: "Sauvegarder",
    scope: "Saisie",
  },
  {
    id: "escape",
    shortcut: "Echap",
    action: "Fermer / annuler",
    scope: "Global",
  },
  {
    id: "arrows",
    shortcut: "↑↓",
    action: "Naviguer dans une liste",
    scope: "Global",
  },
  {
    id: "enter",
    shortcut: "Entrée",
    action: "Valider la sélection",
    scope: "Global",
  },
] as const;
