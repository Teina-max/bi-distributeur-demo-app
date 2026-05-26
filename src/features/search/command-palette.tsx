import { useNavigate } from "@tanstack/react-router";
import * as React from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";

import { COMMANDS, filterCommands } from "./commands";
import type { Command as CommandType } from "./types";

type Props = {
  onClose: () => void;
};

export function CommandPalette({ onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(
    () => filterCommands(COMMANDS, query),
    [query],
  );

  const runCommand = React.useCallback(
    (command: CommandType) => {
      if (command.action === "sign-out") {
        void Promise.resolve(authClient.signOut()).then(() => {
          void navigate({ to: "/auth/signin" });
        });
        onClose();
        return;
      }
      if (command.to) {
        void navigate({ to: command.to });
        onClose();
        return;
      }
      onClose();
    },
    [navigate, onClose],
  );

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-lg p-0"
        showCloseButton={false}
        aria-label="Palette de commandes"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Palette de commandes</DialogTitle>
          <DialogDescription>
            Tapez pour filtrer les actions disponibles.
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="rounded-xl">
          <CommandInput
            placeholder="Tapez pour filtrer..."
            value={query}
            onValueChange={setQuery}
            autoFocus
          />
          <CommandList>
            <CommandEmpty>Aucune commande</CommandEmpty>
            <CommandGroup heading="Navigation">
              {filtered.map((command) => (
                <CommandItem
                  key={command.id}
                  value={command.id}
                  onSelect={() => runCommand(command)}
                >
                  <span>{command.label}</span>
                  {command.hint !== undefined ? (
                    <CommandShortcut>{command.hint}</CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
