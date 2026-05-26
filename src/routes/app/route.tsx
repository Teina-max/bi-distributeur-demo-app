import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { GlobalOverlays } from "@/features/search/global-overlays";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { SiteConfig } from "@/site-config";
import { AppLayoutSkeleton } from "./_components/app-layout-skeleton";
import { AppSidebar } from "./_components/app-sidebar";

// L3 GlobalOverlays binds F1/F3/Ctrl+K via window keydown listener. To let
// users still trigger F3 from the TopBar button (pedagogical hint), dispatch
// a synthetic keydown that L3 picks up — the local useKeyboardScope below
// intentionally omits F3 to avoid double interception.
const triggerKey = (key: string) =>
  window.dispatchEvent(new KeyboardEvent("keydown", { key }));

const getRequiredAppUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getRequiredUser } = await import("@/lib/auth/auth-user");
    return getRequiredUser();
  },
);

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const user = await getRequiredAppUser();
    return { user };
  },
  component: AppLayout,
  pendingComponent: AppLayoutSkeleton,
});

type ActionDef = {
  keyName: string;
  label: string;
  onClick: () => void;
};

function AppLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const actions: ActionDef[] = [
    {
      keyName: "F2",
      label: "Nouveau BL",
      onClick: () => {
        void navigate({ to: "/app/delivery-forms/new" });
      },
    },
    { keyName: "F3", label: "Recherche", onClick: () => triggerKey("F3") },
    {
      keyName: "F5",
      label: "Refresh",
      onClick: () => window.location.reload(),
    },
  ];

  // Skip F3 here — L3 GlobalOverlays owns the F3 / F1 / Ctrl+K handling
  // globally. Re-binding F3 locally would double-trigger (toast + palette).
  useKeyboardScope(
    "app-layout",
    Object.fromEntries(
      actions
        .filter((a) => a.keyName !== "F3")
        .map((a) => [a.keyName, a.onClick]),
    ),
  );

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user.email} />
      <SidebarInset>
        <header className="bg-card flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <nav className="ml-auto flex items-center gap-2">
            {actions.map((action) => (
              <Button
                key={action.keyName}
                variant="outline"
                size="sm"
                onClick={action.onClick}
              >
                <span>{action.label}</span>
                <kbd className="bg-muted text-muted-foreground ml-2 inline-flex h-5 items-center rounded border px-1.5 font-mono text-[10px]">
                  {action.keyName}
                </kbd>
              </Button>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
        <footer className="text-muted-foreground border-t px-6 py-3 text-xs">
          <span>
            {SiteConfig.title} — POC interne Toscana Beverages SARL · Mode démo Phase 0
          </span>
        </footer>
        <GlobalOverlays />
      </SidebarInset>
    </SidebarProvider>
  );
}
