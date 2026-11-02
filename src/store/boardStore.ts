import { create } from "zustand";
import type { BoardElement } from "../lib/elements/types";
import type { Point } from "../lib/types";
import {
  INITIAL_VIEWPORT,
  panBy,
  zoomAt,
  type Viewport,
} from "../lib/viewport";

/** Ferramentas disponíveis. "hand" só move a câmera. */
export type Tool = "rectangle" | "hand";

interface BoardState {
  elements: BoardElement[];
  selectedIds: string[];
  tool: Tool;
  viewport: Viewport;

  addElement: (element: BoardElement) => void;
  setTool: (tool: Tool) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screenPoint: Point, factor: number) => void;
}

export const useBoardStore = create<BoardState>()((set) => ({
  elements: [],
  selectedIds: [],
  tool: "rectangle",
  viewport: INITIAL_VIEWPORT,

  addElement: (element) =>
    set((state) => ({ elements: [...state.elements, element] })),
  setTool: (tool) => set({ tool }),
  panBy: (dx, dy) =>
    set((state) => ({ viewport: panBy(state.viewport, dx, dy) })),
  zoomAt: (screenPoint, factor) =>
    set((state) => ({ viewport: zoomAt(state.viewport, screenPoint, factor) })),
}));
