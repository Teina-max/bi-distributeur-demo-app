const siteTitle = "BI Distributeur Premium";
const siteDescription =
  "Demo publique d'un ERP clavier-first standalone pour distributeur premium : devis, BL, factures, BC fournisseurs, stock, tickets SAV.";

export const SiteConfig = {
  title: siteTitle,
  description: siteDescription,
  prodUrl: "https://bi-distributeur-demo.vercel.app",
  appId: "bi-distributeur-demo",
  domain: "bi-distributeur-demo.vercel.app",
  appIcon: "/favicon.svg",
  locale: "fr_FR",
  seo: {
    titleTemplate: `%s | ${siteTitle}`,
    defaultTitle: `${siteTitle} — Demo`,
    defaultImage: {
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: `${siteTitle} — ERP demo Toscana Beverages SARL`,
    },
  },
  company: {
    name: "Toscana Beverages SARL",
    address: "Mediterranee, France",
    contactEmail: "contact@toscana.local",
  },
  brand: {
    primary: "#D7372C",
    ogImage: {
      background: "#050505",
      foreground: "#fafafa",
      mutedForeground: "#a1a1aa",
      border: "#27272a",
      accent: "#21b6cf",
    },
  },
  team: {
    image: "https://github.com/Teina-max.png",
    website: "https://teina-portfolio.com",
    twitter: "",
    name: "Teina",
  },
  features: {
    /**
     * Legacy template flag, unused since landing was removed.
     */
    enableLandingRedirection: true as boolean,
  },
};
