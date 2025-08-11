import { create } from "zustand";
import type { SelectionGroupDetails } from "@/hooks/use-selection-groups";

interface SelectionState {
  activeGroup: SelectionGroupDetails | null;
  setActiveGroup: (group: SelectionGroupDetails | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  activeGroup: null,
  setActiveGroup: (group) => set({ activeGroup: group }),
})); 