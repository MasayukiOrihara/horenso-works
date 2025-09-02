// useErrorStore.ts
import { create } from "zustand";

type AppError = { id: string; message: string; detail?: string };
type State = {
  errors: AppError[];
  push: (e: Omit<AppError, "id">) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useErrorStore = create<State>((set) => ({
  errors: [],
  push: (e) =>
    set((s) => ({ errors: [...s.errors, { id: crypto.randomUUID(), ...e }] })),
  remove: (id) => set((s) => ({ errors: s.errors.filter((x) => x.id !== id) })),
  clear: () => set({ errors: [] }),
}));
