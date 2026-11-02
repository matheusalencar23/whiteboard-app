import { create } from "zustand";
import type { BoardElement } from "../lib/elements/types";
import type { Point } from "../lib/types";
import { INITIAL_VIEWPORT, panBy, zoomAt, type Viewport } from "../lib/viewport";

export type Tool =
  | "selection"
  | "hand"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "arrow"
  | "freedraw"
  | "text";

/** Quantos passos de desfazer guardar. */
const HISTORY_LIMIT = 100;

interface BoardState {
  elements: BoardElement[];
  selectedIds: string[];
  tool: Tool;
  viewport: Viewport;
  /** Snapshots anteriores de `elements`. O último é o mais recente. */
  past: BoardElement[][];
  future: BoardElement[][];

  // Ações discretas: já registram no histórico.
  addElement: (element: BoardElement, options?: { select?: boolean }) => void;
  replaceElement: (element: BoardElement) => void;
  deleteElements: (ids: string[]) => void;

  // Ações contínuas (arrastar, redimensionar): não registram no histórico.
  // Quem chama guarda os elementos do início e chama `commitHistory` no fim.
  updateElements: (updated: BoardElement[]) => void;
  commitHistory: (before: BoardElement[]) => void;

  undo: () => void;
  redo: () => void;

  setSelection: (ids: string[]) => void;
  setTool: (tool: Tool) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screenPoint: Point, factor: number) => void;
}

/** Remove da seleção os ids que não existem mais em `elements`. */
function keepExisting(selectedIds: string[], elements: BoardElement[]) {
  const ids = new Set(elements.map((el) => el.id));
  return selectedIds.filter((id) => ids.has(id));
}

function pushPast(past: BoardElement[][], snapshot: BoardElement[]) {
  return [...past, snapshot].slice(-HISTORY_LIMIT);
}

export const useBoardStore = create<BoardState>()((set) => ({
  elements: [],
  selectedIds: [],
  tool: "selection",
  viewport: INITIAL_VIEWPORT,
  past: [],
  future: [],

  addElement: (element, options) =>
    set((state) => ({
      elements: [...state.elements, element],
      selectedIds: options?.select ? [element.id] : state.selectedIds,
      past: pushPast(state.past, state.elements),
      future: [],
    })),

  replaceElement: (element) =>
    set((state) => ({
      elements: state.elements.map((el) => (el.id === element.id ? element : el)),
      past: pushPast(state.past, state.elements),
      future: [],
    })),

  deleteElements: (ids) =>
    set((state) => {
      const toDelete = new Set(ids);
      const elements = state.elements.filter((el) => !toDelete.has(el.id));
      if (elements.length === state.elements.length) return {};
      return {
        elements,
        selectedIds: keepExisting(state.selectedIds, elements),
        past: pushPast(state.past, state.elements),
        future: [],
      };
    }),

  updateElements: (updated) =>
    set((state) => {
      const byId = new Map(updated.map((el) => [el.id, el]));
      return { elements: state.elements.map((el) => byId.get(el.id) ?? el) };
    }),

  commitHistory: (before) =>
    set((state) =>
      // Nada mudou (ex.: clique sem arrastar): não cria um passo vazio.
      before === state.elements ? {} : { past: pushPast(state.past, before), future: [] },
    ),

  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return {};
      return {
        elements: previous,
        selectedIds: keepExisting(state.selectedIds, previous),
        past: state.past.slice(0, -1),
        future: [...state.future, state.elements],
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future.at(-1);
      if (!next) return {};
      return {
        elements: next,
        selectedIds: keepExisting(state.selectedIds, next),
        past: pushPast(state.past, state.elements),
        future: state.future.slice(0, -1),
      };
    }),

  setSelection: (selectedIds) => set({ selectedIds }),
  // Trocar de ferramenta desfaz a seleção, como no Excalidraw.
  setTool: (tool) =>
    set((state) => ({ tool, selectedIds: tool === "selection" ? state.selectedIds : [] })),
  panBy: (dx, dy) => set((state) => ({ viewport: panBy(state.viewport, dx, dy) })),
  zoomAt: (screenPoint, factor) =>
    set((state) => ({ viewport: zoomAt(state.viewport, screenPoint, factor) })),
}));
