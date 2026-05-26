import type * as React from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { AppLogoMark } from "@/components/nowts/app-logo-mark";
import { Typography } from "@/components/nowts/typography";
import { authClient } from "@/lib/auth-client";
import { SiteConfig } from "@/site-config";

type NavLink = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Match active when location.pathname === to (root) vs startsWith for sections. */
  exact?: boolean;
};

const NAV_LINKS: readonly NavLink[] = [
  { label: "Tableau de bord", to: "/app", icon: LayoutDashboard, exact: true },
  { label: "Devis", to: "/app/quotations", icon: FileText },
  { label: "Bons de livraison", to: "/app/delivery-forms", icon: Truck },
  { label: "Factures", to: "/app/invoices", icon: Receipt },
  {
    label: "BC fournisseurs",
    to: "/app/purchase-orders",
    icon: ShoppingCart,
  },
  { label: "Produits", to: "/app/products", icon: Package },
  { label: "Clients", to: "/app/clients", icon: Users },
  { label: "Insights BI", to: "/app/insights", icon: BarChart3 },
  { label: "Tickets SAV", to: "/app/tickets", icon: LifeBuoy },
] as const;

type AppSidebarProps = {
  userEmail: string;
};

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (link: NavLink): boolean =>
    link.exact
      ? location.pathname === link.to
      : location.pathname === link.to ||
        location.pathname.startsWith(`${link.to}/`);

  const handleSignOut = async () => {
    await authClient.signOut();
    void navigate({ to: "/auth/signin" });
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <AppLogoMark className="size-8" />
          <Typography variant="large" className="leading-none">
            {SiteConfig.title}
          </Typography>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_LINKS.map((link) => (
                <SidebarMenuItem key={link.to}>
                  <SidebarMenuButton asChild isActive={isActive(link)}>
                    <Link to={link.to}>
                      <link.icon className="size-4" />
                      <span>{link.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="text-muted-foreground truncate px-2 py-1 text-xs">
              {userEmail}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/account">
                <Settings className="size-4" />
                <span>Mon compte</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                to="/orgs/$orgSlug/settings"
                params={{ orgSlug: "toscana-beverages-demo" }}
              >
                <Building2 className="size-4" />
                <span>Organisation</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                void handleSignOut();
              }}
            >
              <LogOut className="size-4" />
              <span>Se déconnecter</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
