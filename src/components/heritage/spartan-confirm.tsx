import * as React from "react";

type Props = {
  message: string;
  details?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function SpartanConfirm({
  message,
  details,
  onConfirm,
  onCancel,
}: Props) {
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "o") {
        event.preventDefault();
        onConfirm();
      } else if (key === "n" || key === "escape") {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onConfirm, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="min-w-[360px] border border-[var(--hz-border)] bg-white p-3 text-[13px]">
        <div className="mb-2 font-[var(--hz-font-ui)]">{message}</div>
        {details ? <div className="hz-mono mb-2">{details}</div> : null}
        <div className="border-t border-[var(--hz-border)] pt-2 text-[12px]">
          Continuer ? (O/N)
        </div>
      </div>
    </div>
  );
}
