import { create } from "zustand";
import type { BoardElement } from "../lib/elements/types";
import { updateBoundArrows } from "../lib/elements/bindings";
import type { Point } from "../lib/types";
import { debounce, loadBoard, saveBoard } from "../lib/persistence";
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

  // Ações discretas: já registram no histórico. As que alteram elementos
  // também recalculam as setas ligadas a eles (`updateBoundArrows`).
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

/** Intervalo do salvamento automático, para não serializar o board a cada movimento do mouse. */
const SAVE_DELAY = 300;

const saved = loadBoard();

export const useBoardStore = create<BoardState>()((set) => ({
  elements: saved?.elements ?? [],
  selectedIds: [],
  tool: "selection",
  viewport: saved?.viewport ?? INITIAL_VIEWPORT,
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
      ),
      past: pushPast(state.past, state.elements),
      future: [],
    })),

  deleteElements: (ids) =>
    set((state) => {
      const toDelete = new Set(ids);
      const remaining = state.elements.filter((el) => !toDelete.has(el.id));
      if (remaining.length === state.elements.length) return {};
      // Setas ligadas aos apagados ficam, mas desligadas.
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
      return { elements: updateBoundArrows(elements, byId.keys()) };
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

// Salvamento automático: grava `elements` e `viewport` quando um dos dois muda.
const scheduleSave = debounce(saveBoard, SAVE_DELAY);

const unsubscribe = useBoardStore.subscribe((state, prev) => {
  if (state.elements === prev.elements && state.viewport === prev.viewport) return;
  scheduleSave({ elements: state.elements, viewport: state.viewport });
});

// Grava o que estiver pendente antes de a página fechar ou recarregar.
const flushSave = () => scheduleSave.flush();
window.addEventListener("pagehide", flushSave);

// No HMR, este módulo é recriado: grava o pendente e solta os listeners antigos.
import.meta.hot?.dispose(() => {
  scheduleSave.flush();
  unsubscribe();
  window.removeEventListener("pagehide", flushSave);
});
