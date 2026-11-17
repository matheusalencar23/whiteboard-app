import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { BoardState, BoardStore } from "./boardStore";

export const BoardStoreContext = createContext<BoardStore | null>(null);

export function useBoardStoreApi(): BoardStore {
  const store = useContext(BoardStoreContext);
  if (!store) throw new Error("useBoardStoreApi precisa estar dentro de um BoardStoreContext.");
  return store;
}

export function useBoardStore<T>(selector: (state: BoardState) => T): T {
  return useStore(useBoardStoreApi(), selector);
}
