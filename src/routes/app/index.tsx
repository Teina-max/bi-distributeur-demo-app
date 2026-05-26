import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Typography } from "@/components/nowts/typography";
import { api } from "@convex/_generated/api";
import { DashboardSkeleton } from "./_components/dashboard/dashboard-skeleton";
import { TodayDeliveryFormsCard } from "./_components/dashboard/today-delivery-forms-card";
import { TodayInvoicesCard } from "./_components/dashboard/today-invoices-card";
import { TodayQuotationsCard } from "./_components/dashboard/today-quotations-card";

type CardKind = "quotations" | "delivery-forms" | "invoices";
const CARD_ORDER: readonly CardKind[] = [
  "quotations",
  "delivery-forms",
  "invoices",
] as const;

export const Route = createFileRoute("/app/")({
  component: DashboardIndex,
  pendingComponent: DashboardSkeleton,
});

function DashboardIndex() {
  const digest = useQuery(api.dashboard.queries.todayDigest, {});
  const [userActive, setUserActive] = useState<CardKind | null>(null);

  const counts = useMemo(
    () => ({
      quotations: digest?.quotations.length ?? 0,
      "delivery-forms": digest?.deliveryForms.length ?? 0,
      invoices: digest?.invoices.length ?? 0,
    }),
    [digest],
  );

  // Derive the effective active card. If the user has chosen one with
  // content, honour it. Otherwise pick the first non-empty card, falling
  // back to "quotations" when everything is empty.
  const activeCard = useMemo<CardKind>(() => {
    if (userActive && counts[userActive] > 0) return userActive;
    const firstNonEmpty = CARD_ORDER.find((k) => counts[k] > 0);
    return firstNonEmpty ?? "quotations";
  }, [userActive, counts]);

  // Tab / Shift+Tab cycle between non-empty cards.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      // Skip when typing in inputs (defensive — dashboard has none).
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
      }
      const nonEmpty = CARD_ORDER.filter((k) => counts[k] > 0);
      if (nonEmpty.length === 0) return;
      event.preventDefault();
      const currentIdx = nonEmpty.indexOf(activeCard);
      const step = event.shiftKey ? -1 : 1;
      const nextIdx =
        currentIdx === -1
          ? 0
          : (currentIdx + step + nonEmpty.length) % nonEmpty.length;
      setUserActive(nonEmpty[nextIdx]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [counts, activeCard]);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });

  if (!digest) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="h2">Aujourd'hui</Typography>
        <Typography variant="muted" className="capitalize">
          {today}
        </Typography>
      </div>

      <div className="flex flex-col gap-4">
        <TodayQuotationsCard
          items={digest.quotations}
          enabled={activeCard === "quotations"}
          onFocusRequest={() => setUserActive("quotations")}
        />
        <TodayDeliveryFormsCard
          items={digest.deliveryForms}
          enabled={activeCard === "delivery-forms"}
          onFocusRequest={() => setUserActive("delivery-forms")}
        />
        <TodayInvoicesCard
          items={digest.invoices}
          enabled={activeCard === "invoices"}
          onFocusRequest={() => setUserActive("invoices")}
        />
      </div>
    </div>
  );
}
