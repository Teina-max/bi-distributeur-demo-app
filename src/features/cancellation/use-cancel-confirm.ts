import { Ban } from "lucide-react";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";

type UseCancelConfirmArgs = {
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: (reason: string) => Promise<void>;
};

export function useCancelConfirm({
  title,
  description,
  actionLabel,
  onConfirm,
}: UseCancelConfirmArgs) {
  return () => {
    dialogManager.input({
      title,
      description,
      icon: Ban,
      variant: "destructive",
      input: {
        label: "Raison de l'annulation",
        placeholder: "Erreur de saisie, retour client...",
      },
      action: {
        label: actionLabel,
        variant: "destructive",
        onClick: async (value) => {
          const reason = value?.trim() ?? "";
          if (reason.length === 0) {
            throw new Error("Raison requise");
          }
          if (reason.length < 5) {
            throw new Error("Raison trop courte");
          }
          await onConfirm(reason);
        },
      },
      cancel: { label: "Garder" },
    });
  };
}
