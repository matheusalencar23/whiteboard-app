import { create } from "zustand";
import { IDENTITY_CAMERA, type Camera } from "../lib/canvas/camera";
import type { CanvasElement, Point } from "../lib/geometry/types";
import type { Tool } from "../lib/canvas/types";

const MAX_HISTORY = 100;

interface CanvasStore {
  elements: CanvasElement[];
  addElement: (el: CanvasElement) => void;
  updateElement: (id: string, el: CanvasElement) => void;
  deleteElement: (id: string) => void;
  addElements: (els: CanvasElement[]) => void;
  setElements: (elements: CanvasElement[]) => void;

  camera: Camera;
  setCamera: (camera: Camera | ((prev: Camera) => Camera)) => void;

  selectedElementIds: string[];
  setSelectedElementIds: (ids: string[]) => void;
  deleteSelectedElements: () => void;
  toggleElementId: (id: string) => void;

  editingElementId: string | null;
  editingBeforeSnapshot: CanvasElement[];
  startEditingSession: (id: string, before: CanvasElement[]) => void;
  endEditingSession: () => void;

  selectionBox: { start: Point; current: Point } | null;
  setSelectionBox: (box: { start: Point; current: Point } | null) => void;

  cursor: string;
  setCursor: (cursor: string) => void;

  activeTool: Tool;
  setTool: (tool: Tool) => void;

  history: { past: CanvasElement[][]; future: CanvasElement[][] };
  commitHistory: (previousElement: CanvasElement[]) => void;
  undo: () => void;
  redo: () => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  elements: [],
  addElement: (el) => set((state) => ({ elements: [...state.elements, el] })),
  updateElement: (id, newEl) =>
    set((state) => ({
      elements: state.elements.map((el) => (el.id === id ? newEl : el)),
    })),
  deleteElement: (id) =>
    set((state) => ({ elements: state.elements.filter((el) => el.id !== id) })),
  addElements: (els) =>
    set((state) => ({ elements: [...state.elements, ...els] })),
  setElements: (elements) =>
    set({
      elements,
      selectedElementIds: [],
      history: { past: [], future: [] },
    }),

  camera: IDENTITY_CAMERA,
  setCamera: (camera) =>
    set((state) => ({
      camera: typeof camera === "function" ? camera(state.camera) : camera,
    })),

  selectedElementIds: [],
  setSelectedElementIds: (ids) => set({ selectedElementIds: ids }),
  deleteSelectedElements: () =>
    set((state) => ({
      elements: state.elements.filter(
        (el) => !state.selectedElementIds.includes(el.id),
      ),
      selectedElementIds: [],
    })),

  toggleElementId: (id) =>
    set((state) => ({
      selectedElementIds: state.selectedElementIds.includes(id)
        ? state.selectedElementIds.filter((existingId) => existingId !== id)
        : [...state.selectedElementIds, id],
    })),

  editingElementId: null,
  editingBeforeSnapshot: [],
  startEditingSession: (id, before) =>
    set({ editingElementId: id, editingBeforeSnapshot: before }),
  endEditingSession: () =>
    set({ editingElementId: null, editingBeforeSnapshot: [] }),

  selectionBox: null,
  setSelectionBox: (box) => set({ selectionBox: box }),

  cursor: "default",
  setCursor: (cursor) => set(() => ({ cursor: cursor })),

  activeTool: "selection",
  setTool: (tool) => set(() => ({ activeTool: tool })),

  history: { past: [], future: [] },
  commitHistory: (previousElements) =>
    set((state) => {
      if (previousElements === state.elements) return {};
      return {
        history: {
          past: [...state.history.past, previousElements].slice(-MAX_HISTORY),
          future: [],
        },
      };
    }),

  undo: () =>
    set((state) => {
      if (state.history.past.length === 0) return {};

      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, -1);

      return {
        elements: previous,
        selectedElementIds: state.selectedElementIds.filter((id) =>
          previous.some((el) => el.id === id),
        ),
        history: {
          past: newPast,
          future: [state.elements, ...state.history.future],
        },
      };
    }),

  redo: () =>
    set((state) => {
      if (state.history.future.length === 0) return {};

      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);

      return {
        elements: next,
        selectedElementIds: state.selectedElementIds.filter((id) =>
          next.some((el) => el.id === id),
        ),
        history: {
          past: [...state.history.past, state.elements],
          future: newFuture,
        },
      };
    }),
}));
