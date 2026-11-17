import { createContext, useContext, type RefObject } from "react";

export type BoardRootRef = RefObject<HTMLDivElement | null>;

export const BoardRootContext = createContext<BoardRootRef | null>(null);

export function useBoardRoot(): BoardRootRef {
  const root = useContext(BoardRootContext);
  if (!root) throw new Error("useBoardRoot precisa estar dentro de um BoardRootContext.");
  return root;
}

export function focusBoard(root: BoardRootRef) {
  root.current?.focus({ preventScroll: true });
}
