import { create } from "zustand";

export type DialogType = never;

export const useGlobalDialogStore = create<{
  openDialog: DialogType | null;
  setOpenDialog: (dialog: DialogType | null) => void;
}>((set) => ({
  openDialog: null,
  setOpenDialog: (dialog) => set({ openDialog: dialog }),
}));

export const openGlobalDialog = (_dialog: never) => {
  useGlobalDialogStore.getState().setOpenDialog(null);
};

export const closeGlobalDialog = () => {
  useGlobalDialogStore.getState().setOpenDialog(null);
};
