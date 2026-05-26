import { useNow } from "@/hooks/use-now";

type Props = { userName: string; hints?: string };

export function StatusBar({ userName, hints }: Props) {
  const now = useNow();
  const dateLabel = now.toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  return (
    <div className="flex justify-between border-t border-[var(--hz-border)] bg-[var(--hz-bg-toolbar)] px-2 py-1 text-[12px]">
      <span>User: {userName}</span>
      <span className="hz-mono">{dateLabel}</span>
      <span>{hints ?? ""}</span>
    </div>
  );
}
