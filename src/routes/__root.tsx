import { DebugPanel } from "@/features/debug";
import { Page404 } from "@/features/page/page-404";
import { SignInDialog } from "@/features/auth/sign-in-dialog";
import { CreateOrganizationDialog } from "@/features/organization/create-organization-dialog";
import { authClient } from "@/lib/auth-client";
import { createSeoHead, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { SiteConfig } from "@/site-config";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { ConvexReactClient } from "convex/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { Suspense } from "react";
import appCss from "@/globals.css?url";
import { Providers } from "@/-providers";

const rootSeoHead = createSeoHead({
  title: SiteConfig.seo.defaultTitle,
  canonical: false,
  jsonLd: [organizationJsonLd(), websiteJsonLd()],
});

type RouterContext = {
  convexClient: ConvexReactClient;
};

type RootSearch = {
  modal?: string;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: (search: Record<string, unknown>): RootSearch => ({
    modal: (search.modal as string) || undefined,
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google", content: "notranslate" },
      ...rootSeoHead.meta,
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        href: "https://res.cloudinary.com/dttleawx6/image/upload/f_ico,w_64,h_64,c_fit,q_auto/bi-distributeur-demo/brand/toscano-logo",
        sizes: "any",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "https://res.cloudinary.com/dttleawx6/image/upload/f_png,w_16,h_16,c_fit,q_auto/bi-distributeur-demo/brand/toscano-logo",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "https://res.cloudinary.com/dttleawx6/image/upload/f_png,w_32,h_32,c_fit,q_auto/bi-distributeur-demo/brand/toscano-logo",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "https://res.cloudinary.com/dttleawx6/image/upload/f_png,w_180,h_180,c_fit,q_auto/bi-distributeur-demo/brand/toscano-logo",
      },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  component: RootLayout,
  notFoundComponent: Page404,
});

function RootLayout() {
  const { convexClient } = Route.useRouteContext();

  return (
    <html lang="en" translate="no" className="h-full" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body
        suppressHydrationWarning
        className={cn("bg-background h-full font-sans antialiased")}
      >
        <ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
          <NuqsAdapter>
            <Providers>
              <Suspense fallback={null}>
                <Outlet />
              </Suspense>
              <SignInDialog />
              <CreateOrganizationDialog />
              {import.meta.env.DEV ? <DebugPanel /> : null}
            </Providers>
          </NuqsAdapter>
        </ConvexBetterAuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
