import { KeyboardHint } from "./keyboard-hint";

export type TopBarHint = {
  keyName: string;
  label: string;
  onClick?: () => void;
};

export function TopBar({ hints }: { hints: readonly TopBarHint[] }) {
  return (
    <div className="flex gap-1 border-b border-[var(--hz-border)] bg-[var(--hz-bg-toolbar)] px-2 py-1">
      {hints.map((h) => (
        <KeyboardHint
          key={h.keyName}
          keyName={h.keyName}
          label={h.label}
          onClick={h.onClick}
        />
      ))}
    </div>
  );
}
