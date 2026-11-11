import { create } from "zustand";
import { applyStyle } from "../lib/elements/style";
import { applyTextStyle, getTextStyle, stepFontSize } from "../lib/elements/textStyle";
import {
  DEFAULT_ARROWHEADS,
  DEFAULT_STYLE,
  DEFAULT_TEXT_STYLE,
  type ElementStyle,
  type TextStyle,
  type Arrowhead,
  type ArrowheadPair,
  type ArrowRouting,
  type BoardElement,
} from "../lib/elements/types";
import { releaseBindings, setArrowRouting, updateBoundArrows, type ArrowEnd } from "../lib/elements/bindings";
import { translateElement } from "../lib/elements/registry";
import type { Point } from "../lib/types";
import {
  DEFAULT_BOARD_NAME,
  debounce,
  loadPreferences,
  loadStoredBoard,
  normalizeBoardName,
  savePreferences,
  saveStoredBoard,
  type BoardContent,
} from "../lib/persistence";
import { GRID_STYLES, type GridStyle } from "../lib/render/grid";
import { INITIAL_VIEWPORT, nextZoomStep, panBy, zoomAt, zoomTo, type Viewport } from "../lib/viewport";

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

export interface Notice {
  id: number;
  message: string;
  tone: "info" | "error";
}

export interface BoardState {
  boardId: string | null;
  name: string;
  elements: BoardElement[];
  selectedIds: string[];
  tool: Tool;
  viewport: Viewport;
  arrowRouting: ArrowRouting;
  arrowheads: ArrowheadPair;
  currentStyle: ElementStyle;
  currentTextStyle: TextStyle;
  showGrid: boolean;
  gridStyle: GridStyle;
  helpOpen: boolean;
  exportOpen: boolean;
  notice: Notice | null;
  past: BoardElement[][];
  future: BoardElement[][];

  addElement: (element: BoardElement, options?: { select?: boolean }) => void;
  insertElements: (inserted: BoardElement[]) => void;
  translateElements: (ids: string[], dx: number, dy: number, options?: { record?: boolean }) => void;
  replaceElement: (element: BoardElement) => void;
  deleteElements: (ids: string[]) => void;
  loadStoredBoard: (id: string) => boolean;
  openBoard: (board: BoardContent) => void;
  setBoardName: (name: string) => void;

  updateElements: (updated: BoardElement[]) => void;
  commitHistory: (before: BoardElement[]) => void;

  undo: () => void;
  redo: () => void;

  setSelection: (ids: string[]) => void;
  setTool: (tool: Tool) => void;
  setArrowRouting: (routing: ArrowRouting) => void;
  setArrowhead: (end: ArrowEnd, arrowhead: Arrowhead) => void;
  swapArrowheads: () => void;
  setStyle: (patch: Partial<ElementStyle>, options?: { record?: boolean }) => void;
  setTextStyle: (patch: Partial<TextStyle>, options?: { record?: boolean }) => void;
  stepTextSize: (direction: 1 | -1) => void;
  toggleGrid: () => void;
  setGridStyle: (style: GridStyle) => void;
  cycleGridStyle: () => void;
  setHelpOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  showNotice: (message: string, tone?: Notice["tone"]) => void;
  dismissNotice: (id: number) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screenPoint: Point, factor: number) => void;
  stepZoom: (direction: 1 | -1) => void;
  resetZoom: () => void;
}

function keepExisting(selectedIds: string[], elements: BoardElement[]) {
  const ids = new Set(elements.map((el) => el.id));
  return selectedIds.filter((id) => ids.has(id));
}

function pushPast(past: BoardElement[][], snapshot: BoardElement[]) {
  return [...past, snapshot].slice(-HISTORY_LIMIT);
}

const SAVE_DELAY = 300;

function screenCenter(): Point {
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

const preferences = loadPreferences();

let noticeCount = 0;

export const useBoardStore = create<BoardState>()((set) => ({
  boardId: null,
  name: DEFAULT_BOARD_NAME,
  elements: [],
  selectedIds: [],
  tool: "selection",
  viewport: INITIAL_VIEWPORT,
  arrowRouting: "straight",
  arrowheads: DEFAULT_ARROWHEADS,
  currentStyle: DEFAULT_STYLE,
  currentTextStyle: DEFAULT_TEXT_STYLE,
  showGrid: preferences.showGrid,
  gridStyle: preferences.gridStyle,
  helpOpen: false,
  exportOpen: false,
  notice: null,
  past: [],
  future: [],

  addElement: (element, options) =>
    set((state) => ({
      elements: [...state.elements, element],
      selectedIds: options?.select ? [element.id] : state.selectedIds,
      past: pushPast(state.past, state.elements),
      future: [],
    })),

  insertElements: (inserted) =>
    set((state) => {
      if (inserted.length === 0) return {};
      const ids = inserted.map((el) => el.id);
      return {
        elements: updateBoundArrows([...state.elements, ...inserted], ids),
        selectedIds: ids,
        tool: "selection",
        past: pushPast(state.past, state.elements),
        future: [],
      };
    }),

  translateElements: (ids, dx, dy, options) =>
    set((state) => {
      const moving = new Set(ids);
      const moved = releaseBindings(
        state.elements.filter((el) => moving.has(el.id)).map((el) => translateElement(el, dx, dy)),
        moving,
      );
      if (moved.length === 0) return {};
      const byId = new Map(moved.map((el) => [el.id, el]));
      const elements = updateBoundArrows(
        state.elements.map((el) => byId.get(el.id) ?? el),
        moving,
        state.elements,
      );
      if (options?.record === false) return { elements };
      return { elements, past: pushPast(state.past, state.elements), future: [] };
    }),

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

  loadStoredBoard: (id) => {
    flushBoardSave();
    const board = loadStoredBoard(id);
    if (!board) return false;
    set({
      boardId: id,
      name: board.name,
      elements: board.elements,
      viewport: board.viewport,
      selectedIds: [],
      tool: "selection",
      helpOpen: false,
      exportOpen: false,
      notice: null,
      past: [],
      future: [],
    });
    return true;
  },

  openBoard: (board) =>
    set((state) => ({
      name: board.name,
      elements: board.elements,
      viewport: board.viewport,
      selectedIds: [],
      tool: "selection",
      past: pushPast(state.past, state.elements),
      future: [],
    })),

  setBoardName: (value) => set({ name: normalizeBoardName(value) ?? DEFAULT_BOARD_NAME }),

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
  stepTextSize: (direction) =>
    set((state) => {
      const currentTextStyle = {
        ...state.currentTextStyle,
        fontSize: stepFontSize(state.currentTextStyle.fontSize, direction),
      };
      const ids = new Set(state.selectedIds);
      let changed = false;
      const elements = state.elements.map((el) => {
        const textStyle = ids.has(el.id) ? getTextStyle(el) : null;
        if (!textStyle) return el;
        const styled = applyTextStyle(el, { fontSize: stepFontSize(textStyle.fontSize, direction) });
        if (styled !== el) changed = true;
        return styled;
      });
      if (!changed) return { currentTextStyle };
      return { currentTextStyle, elements, past: pushPast(state.past, state.elements), future: [] };
    }),
  setTextStyle: (patch, options) =>
    set((state) => {
      const currentTextStyle = { ...state.currentTextStyle, ...patch };
      const ids = new Set(state.selectedIds);
      let changed = false;
      const elements = state.elements.map((el) => {
        if (!ids.has(el.id)) return el;
        const styled = applyTextStyle(el, patch);
        if (styled !== el) changed = true;
        return styled;
      });
      if (!changed) return { currentTextStyle };
      if (options?.record === false) return { currentTextStyle, elements };
      return { currentTextStyle, elements, past: pushPast(state.past, state.elements), future: [] };
    }),
  setStyle: (patch, options) =>
    set((state) => {
      const currentStyle = { ...state.currentStyle, ...patch };
      const ids = new Set(state.selectedIds);
      let changed = false;
      const elements = state.elements.map((el) => {
        if (!ids.has(el.id)) return el;
        const styled = applyStyle(el, patch);
        if (styled !== el) changed = true;
        return styled;
      });
      if (!changed) return { currentStyle };
      if (options?.record === false) return { currentStyle, elements };
      return { currentStyle, elements, past: pushPast(state.past, state.elements), future: [] };
    }),
  swapArrowheads: () =>
    set((state) => {
      const arrowheads = { start: state.arrowheads.end, end: state.arrowheads.start };
      const ids = new Set(state.selectedIds);
      let changed = false;
      const elements = state.elements.map((el) => {
        if (el.type !== "arrow" || !ids.has(el.id) || el.startArrowhead === el.endArrowhead) return el;
        changed = true;
        return { ...el, startArrowhead: el.endArrowhead, endArrowhead: el.startArrowhead };
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
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setExportOpen: (exportOpen) => set({ exportOpen }),
  showNotice: (message, tone = "info") => set({ notice: { id: ++noticeCount, message, tone } }),
  dismissNotice: (id) => set((state) => (state.notice?.id === id ? { notice: null } : {})),
  panBy: (dx, dy) => set((state) => ({ viewport: panBy(state.viewport, dx, dy) })),
  zoomAt: (screenPoint, factor) =>
    set((state) => ({ viewport: zoomAt(state.viewport, screenPoint, factor) })),
  stepZoom: (direction) =>
    set((state) => ({
      viewport: zoomTo(state.viewport, screenCenter(), nextZoomStep(state.viewport.zoom, direction)),
    })),
  resetZoom: () => set((state) => ({ viewport: zoomTo(state.viewport, screenCenter(), 1) })),
}));

let saveFailed = false;

function persistBoard(id: string, content: BoardContent) {
  const ok = saveStoredBoard(id, content);
  if (!ok && !saveFailed) {
    useBoardStore
      .getState()
      .showNotice("Não foi possível salvar: o armazenamento do navegador está cheio.", "error");
  }
  saveFailed = !ok;
}

const scheduleSave = debounce(persistBoard, SAVE_DELAY);

export function flushBoardSave() {
  scheduleSave.flush();
}

const unsubscribe = useBoardStore.subscribe((state, prev) => {
  if (state.showGrid !== prev.showGrid || state.gridStyle !== prev.gridStyle) {
    savePreferences({ showGrid: state.showGrid, gridStyle: state.gridStyle });
  }
  if (state.boardId === null || state.boardId !== prev.boardId) return;
  const changed =
    state.name !== prev.name || state.elements !== prev.elements || state.viewport !== prev.viewport;
  if (!changed) return;
  const { boardId, name, elements, viewport } = state;
  scheduleSave(boardId, { name, elements, viewport });
});

const flushSave = () => scheduleSave.flush();
window.addEventListener("pagehide", flushSave);

import.meta.hot?.dispose(() => {
  scheduleSave.flush();
  unsubscribe();
  window.removeEventListener("pagehide", flushSave);
});
