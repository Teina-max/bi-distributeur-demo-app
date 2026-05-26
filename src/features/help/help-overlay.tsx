import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useHelp } from "./help-context";
import { SHORTCUTS_CATALOG, type ShortcutEntry } from "./shortcuts-catalog";

type Props = {
  onClose: () => void;
};

const sortEntries = (
  entries: readonly ShortcutEntry[],
): readonly ShortcutEntry[] => {
  const sorted = entries.slice();
  sorted.sort((a, b) => {
    if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
    return a.shortcut.localeCompare(b.shortcut);
  });
  return sorted;
};

export function HelpOverlay({ onClose }: Props) {
  const { entries: contextEntries } = useHelp();

  const allEntries = React.useMemo(
    () => sortEntries([...SHORTCUTS_CATALOG, ...contextEntries]),
    [contextEntries],
  );

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "F1") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aide — raccourcis clavier</DialogTitle>
          <DialogDescription>
            Liste des raccourcis disponibles. Echap ou F1 pour fermer.
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1 text-[13px]">Raccourci</TableHead>
              <TableHead className="py-1 text-[13px]">Action</TableHead>
              <TableHead className="py-1 text-[13px]">Scope</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="py-1 text-[13px]">
                  <Kbd>{entry.shortcut}</Kbd>
                </TableCell>
                <TableCell className="py-1 text-[13px]">
                  {entry.action}
                </TableCell>
                <TableCell className="text-muted-foreground py-1 text-[13px]">
                  {entry.scope}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
