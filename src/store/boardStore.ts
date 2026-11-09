import { create } from "zustand";
import {
  DEFAULT_ARROWHEADS,
  type Arrowhead,
  type ArrowheadPair,
  type ArrowRouting,
  type BoardElement,
} from "../lib/elements/types";
import { setArrowRouting, updateBoundArrows, type ArrowEnd } from "../lib/elements/bindings";
import type { Point } from "../lib/types";
import { DEFAULT_PREFERENCES, debounce, loadBoard, saveBoard } from "../lib/persistence";
import { GRID_STYLES, type GridStyle } from "../lib/render/grid";
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

const HISTORY_LIMIT = 100;

export interface BoardState {
  elements: BoardElement[];
  selectedIds: string[];
  tool: Tool;
  viewport: Viewport;
  arrowRouting: ArrowRouting;
  arrowheads: ArrowheadPair;
  showGrid: boolean;
  gridStyle: GridStyle;
  past: BoardElement[][];
  future: BoardElement[][];

  addElement: (element: BoardElement, options?: { select?: boolean }) => void;
  replaceElement: (element: BoardElement) => void;
  deleteElements: (ids: string[]) => void;

  updateElements: (updated: BoardElement[]) => void;
  commitHistory: (before: BoardElement[]) => void;

  undo: () => void;
  redo: () => void;

  setSelection: (ids: string[]) => void;
  setTool: (tool: Tool) => void;
  setArrowRouting: (routing: ArrowRouting) => void;
  setArrowhead: (end: ArrowEnd, arrowhead: Arrowhead) => void;
  toggleGrid: () => void;
  setGridStyle: (style: GridStyle) => void;
  cycleGridStyle: () => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screenPoint: Point, factor: number) => void;
}

function keepExisting(selectedIds: string[], elements: BoardElement[]) {
  const ids = new Set(elements.map((el) => el.id));
  return selectedIds.filter((id) => ids.has(id));
}

function pushPast(past: BoardElement[][], snapshot: BoardElement[]) {
  return [...past, snapshot].slice(-HISTORY_LIMIT);
}

const SAVE_DELAY = 300;

const saved = loadBoard();

export const useBoardStore = create<BoardState>()((set) => ({
  elements: saved?.elements ?? [],
  selectedIds: [],
  tool: "selection",
  viewport: saved?.viewport ?? INITIAL_VIEWPORT,
  arrowRouting: "straight",
  arrowheads: DEFAULT_ARROWHEADS,
  showGrid: saved?.showGrid ?? DEFAULT_PREFERENCES.showGrid,
  gridStyle: saved?.gridStyle ?? DEFAULT_PREFERENCES.gridStyle,
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
      elements: updateBoundArrows(
        state.elements.map((el) => (el.id === element.id ? element : el)),
        [element.id],
        state.elements,
      ),
      past: pushPast(state.past, state.elements),
      future: [],
    })),

  deleteElements: (ids) =>
    set((state) => {
      const toDelete = new Set(ids);
      const remaining = state.elements.filter((el) => !toDelete.has(el.id));
      if (remaining.length === state.elements.length) return {};
      const elements = updateBoundArrows(remaining, []);
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
      const elements = state.elements.map((el) => byId.get(el.id) ?? el);
      return { elements: updateBoundArrows(elements, byId.keys(), state.elements) };
    }),

  commitHistory: (before) =>
    set((state) =>
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
  setTool: (tool) =>
    set((state) => ({ tool, selectedIds: tool === "selection" ? state.selectedIds : [] })),
  setArrowRouting: (arrowRouting) =>
    set((state) => {
      const ids = new Set(state.selectedIds);
      const byId = new Map(state.elements.map((el) => [el.id, el]));
      let changed = false;
      const elements = state.elements.map((el) => {
        if (el.type !== "arrow" || !ids.has(el.id) || el.routing === arrowRouting) return el;
        changed = true;
        return setArrowRouting(el, arrowRouting, byId);
      });
      if (!changed) return { arrowRouting };
      return { arrowRouting, elements, past: pushPast(state.past, state.elements), future: [] };
    }),
  setArrowhead: (end, arrowhead) =>
    set((state) => {
      const key = end === "start" ? "startArrowhead" : "endArrowhead";
      const arrowheads = { ...state.arrowheads, [end]: arrowhead };
      const ids = new Set(state.selectedIds);
      let changed = false;
      const elements = state.elements.map((el) => {
        if (el.type !== "arrow" || !ids.has(el.id) || el[key] === arrowhead) return el;
        changed = true;
        return { ...el, [key]: arrowhead };
      });
      if (!changed) return { arrowheads };
      return { arrowheads, elements, past: pushPast(state.past, state.elements), future: [] };
    }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setGridStyle: (gridStyle) => set({ gridStyle, showGrid: true }),
  cycleGridStyle: () =>
    set((state) => {
      const index = GRID_STYLES.indexOf(state.gridStyle);
      return { gridStyle: GRID_STYLES[(index + 1) % GRID_STYLES.length], showGrid: true };
    }),
  panBy: (dx, dy) => set((state) => ({ viewport: panBy(state.viewport, dx, dy) })),
  zoomAt: (screenPoint, factor) =>
    set((state) => ({ viewport: zoomAt(state.viewport, screenPoint, factor) })),
}));

const scheduleSave = debounce(saveBoard, SAVE_DELAY);

const unsubscribe = useBoardStore.subscribe((state, prev) => {
  const changed =
    state.elements !== prev.elements ||
    state.viewport !== prev.viewport ||
    state.showGrid !== prev.showGrid ||
    state.gridStyle !== prev.gridStyle;
  if (!changed) return;
  const { elements, viewport, showGrid, gridStyle } = state;
  scheduleSave({ elements, viewport, showGrid, gridStyle });
});

const flushSave = () => scheduleSave.flush();
window.addEventListener("pagehide", flushSave);

import.meta.hot?.dispose(() => {
  scheduleSave.flush();
  unsubscribe();
  window.removeEventListener("pagehide", flushSave);
});
