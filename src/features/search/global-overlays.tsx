import { HelpOverlay } from "@/features/help/help-overlay";
import { CommandPalette } from "./command-palette";
import { ContextualSearchOverlay } from "./contextual-search-overlay";
import { useGlobalSearchScope } from "./use-global-search-scope";

/**
 * Mount once in the app layout. Renders the active overlay (palette / clients
 * search / products search / help) based on the global scope state machine.
 * Owns no business state itself.
 */
export function GlobalOverlays() {
  const { mode, close } = useGlobalSearchScope();

  if (mode === "closed") return null;
  if (mode === "palette") return <CommandPalette onClose={close} />;
  if (mode === "help") return <HelpOverlay onClose={close} />;
  return <ContextualSearchOverlay mode={mode} onClose={close} />;
}
