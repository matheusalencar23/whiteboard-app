import { createStore, type StoreApi } from "zustand";
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
import { getCellTarget, hasCellTextPatch, setCellsTextStyle, type CellPosition } from "../lib/elements/shapes/table";
import {
  getGroupMembers,
  getParentGroupId,
  groupElements,
  isInGroup,
  keepEditingGroup,
  ungroupElements,
} from "../lib/elements/groups";
import type { Point } from "../lib/types";
import {
  DEFAULT_PREFERENCES,
  normalizeBoardName,
  type BoardContent,
  type Preferences,
} from "../lib/persistence";
import { GRID_STYLES, type GridStyle } from "../lib/render/grid";
import type { ThemeMode } from "../lib/theme";
import { reorderElements, type OrderDirection } from "../lib/elements/order";
import { addPoolLane, removePoolLane } from "../lib/elements/pool";
import { syncIndices } from "../lib/elements/fractionalIndex";
import type { Messages } from "../i18n/messages";
import { resolveMessages, sameMessages } from "../i18n/locales";
import { fallbackTool, isToolAllowed, resolveConfig, sameConfig, type Tool, type WhiteboardConfig } from "./whiteboardConfig";
import { INITIAL_VIEWPORT, nextZoomStep, panBy, zoomAt, zoomTo, type Viewport } from "../lib/viewport";

export type { Tool };

const HISTORY_LIMIT = 100;

export interface Notice {
  id: number;
  message: string;
  tone: "info" | "error";
}

export interface TableCursor extends CellPosition {
  elementId: string;
  extent?: CellPosition;
}

export type TableTextScope = "table" | "cells";

export interface WhiteboardScene {
  name: string;
  elements: BoardElement[];
  viewport: Viewport;
}

export type ChangeReason = "commit" | "undo" | "redo" | "name" | "viewport" | "external";

export interface ChangeInfo {
  reason: ChangeReason;
  changedIds: readonly string[];
}

export interface LastChange extends ChangeInfo {
  seq: number;
}

export type SceneHistoryMode = "clear" | "record";

export interface UpdateSceneOptions {
  history?: SceneHistoryMode;
}

export function getCellTextTarget(state: Pick<BoardState, "elements" | "selectedIds" | "tableCell" | "tableTextScope">) {
  const { tableCell } = state;
  if (state.tableTextScope !== "cells" || state.selectedIds.length !== 1 || !tableCell) return null;
  const table = state.elements.find((el) => el.id === state.selectedIds[0]);
  if (table?.type !== "table" || tableCell.elementId !== table.id) return null;
  const target = getCellTarget(table, tableCell, tableCell.extent);
  return target && { table, ...target };
}

export interface BoardState {
  name: string;
  elements: BoardElement[];
  selectedIds: string[];
  editingGroupId: string | null;
  tableCell: TableCursor | null;
  tableTextScope: TableTextScope;
  tool: Tool;
  config: WhiteboardConfig;
  messages: Messages;
  viewport: Viewport;
  viewportSize: { width: number; height: number };
  arrowRouting: ArrowRouting;
  arrowheads: ArrowheadPair;
  currentStyle: ElementStyle;
  currentTextStyle: TextStyle;
  showGrid: boolean;
  gridStyle: GridStyle;
  libraryOpen: boolean;
  themeMode: ThemeMode;
  collapsedLibraryGroups: string[];
  helpOpen: boolean;
  exportOpen: boolean;
  notice: Notice | null;
  past: BoardElement[][];
  future: BoardElement[][];
  lastChange: LastChange;

  addElement: (element: BoardElement, options?: { select?: boolean }) => void;
  insertElements: (inserted: BoardElement[]) => void;
  translateElements: (ids: string[], dx: number, dy: number, options?: { record?: boolean }) => void;
  replaceElement: (element: BoardElement) => void;
  deleteElements: (ids: string[]) => void;
  openBoard: (board: BoardContent) => void;
  setBoardName: (name: string) => void;

  updateElements: (updated: BoardElement[]) => void;
  commitHistory: (before: BoardElement[]) => void;
  updateScene: (patch: Partial<WhiteboardScene>, options?: UpdateSceneOptions) => void;
  resetHistory: () => void;
  beginInteraction: () => void;
  endInteraction: () => void;

  undo: () => void;
  redo: () => void;

  setSelection: (ids: string[]) => void;
  setEditingGroup: (groupId: string | null) => void;
  setTableCell: (cursor: TableCursor | null) => void;
  setTableTextScope: (scope: TableTextScope) => void;
  exitEditingGroup: () => boolean;
  groupSelection: () => void;
  ungroupSelection: () => void;
  reorderSelection: (direction: OrderDirection) => void;
  changePoolLanes: (change: "add" | "remove") => void;
  setTool: (tool: Tool) => void;
  setConfig: (config: WhiteboardConfig) => void;
  setMessages: (messages: Messages) => void;
  setArrowRouting: (routing: ArrowRouting) => void;
  setArrowhead: (end: ArrowEnd, arrowhead: Arrowhead) => void;
  swapArrowheads: () => void;
  setStyle: (patch: Partial<ElementStyle>, options?: { record?: boolean }) => void;
  setTextStyle: (patch: Partial<TextStyle>, options?: { record?: boolean }) => void;
  stepTextSize: (direction: 1 | -1) => void;
  toggleGrid: () => void;
  setGridStyle: (style: GridStyle) => void;
  cycleGridStyle: () => void;
  setLibraryOpen: (open: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleLibraryGroup: (groupId: string) => void;
  setViewportSize: (size: { width: number; height: number }) => void;
  setHelpOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  showNotice: (message: string, tone?: Notice["tone"]) => void;
  dismissNotice: (id: number) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screenPoint: Point, factor: number) => void;
  stepZoom: (direction: 1 | -1) => void;
  resetZoom: () => void;
}

export function getPreferences(state: BoardState): Preferences {
  const { showGrid, gridStyle, libraryOpen, themeMode, collapsedLibraryGroups } = state;
  return { showGrid, gridStyle, libraryOpen, themeMode, collapsedLibraryGroups };
}

export function preferencesChanged(state: BoardState, prev: BoardState): boolean {
  return (
    state.showGrid !== prev.showGrid ||
    state.gridStyle !== prev.gridStyle ||
    state.libraryOpen !== prev.libraryOpen ||
    state.themeMode !== prev.themeMode ||
    state.collapsedLibraryGroups !== prev.collapsedLibraryGroups
  );
}

function sanitizeTransient(state: BoardState, elements: BoardElement[]) {
  const byId = new Map(elements.map((el) => [el.id, el]));
  const { tableCell } = state;
  return {
    selectedIds: state.selectedIds.filter((id) => byId.has(id)),
    editingGroupId: keepEditingGroup(state.editingGroupId, elements),
    tableCell: tableCell && byId.get(tableCell.elementId)?.type === "table" ? tableCell : null,
  };
}

function pushPast(past: BoardElement[][], snapshot: BoardElement[]) {
  return [...past, snapshot].slice(-HISTORY_LIMIT);
}

function bumpVersions(previous: BoardElement[], next: BoardElement[], changed: Set<string>): BoardElement[] {
  const before = new Map(previous.map((el) => [el.id, el]));
  const removed = new Set(before.keys());
  const elements = next.map((el) => {
    removed.delete(el.id);
    const old = before.get(el.id);
    if (old === el) return el;
    changed.add(el.id);
    return { ...el, version: Math.max(el.version ?? 0, old?.version ?? 0) + 1 };
  });
  removed.forEach((id) => changed.add(id));
  return elements;
}

function screenCenter({ viewportSize }: BoardState): Point {
  return { x: viewportSize.width / 2, y: viewportSize.height / 2 };
}

export type BoardStore = StoreApi<BoardState>;

export interface InitialStyle {
  element?: Partial<ElementStyle>;
  text?: Partial<TextStyle>;
}

function toolAfterInsert(state: BoardState): Tool {
  return isToolAllowed(state.config, "selection") ? "selection" : state.tool;
}

export interface BoardStoreInit {
  scene?: Partial<WhiteboardScene>;
  preferences?: Partial<Preferences>;
  config?: WhiteboardConfig;
  style?: InitialStyle;
  messages?: Messages;
}

type BoardPatch = Partial<BoardState>;
type BoardUpdate = BoardPatch | ((state: BoardState) => BoardPatch);

export function createBoardStore({
  scene = {},
  preferences: given = {},
  config = resolveConfig(),
  style = {},
  messages = resolveMessages(),
}: BoardStoreInit = {}): BoardStore {
  const preferences = { ...DEFAULT_PREFERENCES, ...given };
  let noticeCount = 0;
  let pendingIds = new Set<string>();
  let interactionDepth = 0;
  let queuedScenes: { patch: Partial<WhiteboardScene>; history: SceneHistoryMode }[] = [];

  return createStore<BoardState>()((rawSet, get) => {
    function nextChange(state: BoardState, reason: ChangeReason, changedIds: readonly string[]): LastChange {
      return { reason, changedIds, seq: state.lastChange.seq + 1 };
    }

    function setWithReason(reason: ChangeReason | null, update: BoardUpdate) {
      const state = get();
      const patch = typeof update === "function" ? update(state) : update;
      const next: BoardPatch = { ...patch };
      const elementsChanged = patch.elements !== undefined && patch.elements !== state.elements;
      if (patch.elements && elementsChanged) {
        next.elements = bumpVersions(state.elements, syncIndices(patch.elements), pendingIds);
      }
      if ((patch.past !== undefined && patch.past !== state.past) || (reason && elementsChanged)) {
        next.lastChange = nextChange(state, reason ?? "commit", [...pendingIds]);
        pendingIds = new Set();
      } else if (patch.name !== undefined && patch.name !== state.name) {
        next.lastChange = nextChange(state, "name", []);
      } else if (patch.viewport !== undefined && patch.viewport !== state.viewport) {
        next.lastChange = nextChange(state, "viewport", []);
      }
      rawSet(next);
    }

    function set(update: BoardUpdate) {
      setWithReason(null, update);
    }

    function applyScene(patch: Partial<WhiteboardScene>, history: SceneHistoryMode) {
      setWithReason("external", (state) => {
        const elements = patch.elements ? updateBoundArrows(patch.elements, []) : state.elements;
        const recorded = history === "record" && elements !== state.elements;
        return {
          ...(patch.name !== undefined && { name: normalizeBoardName(patch.name) ?? state.messages.content.untitledBoard }),
          ...(patch.viewport && { viewport: patch.viewport }),
          elements,
          ...sanitizeTransient(state, elements),
          ...(history === "clear" && { past: [], future: [] }),
          ...(recorded && { past: pushPast(state.past, state.elements), future: [] }),
        };
      });
    }

    return {
      name: normalizeBoardName(scene.name) ?? messages.content.untitledBoard,
      elements: syncIndices(scene.elements ?? []),
      selectedIds: [],
      editingGroupId: null,
      tableCell: null,
      tableTextScope: "table",
      tool: fallbackTool(config),
      config,
      messages,
      viewport: scene.viewport ?? INITIAL_VIEWPORT,
      viewportSize: { width: 0, height: 0 },
      arrowRouting: "straight",
      arrowheads: DEFAULT_ARROWHEADS,
      currentStyle: { ...DEFAULT_STYLE, ...style.element },
      currentTextStyle: { ...DEFAULT_TEXT_STYLE, ...style.text },
      showGrid: preferences.showGrid,
      gridStyle: preferences.gridStyle,
      libraryOpen: preferences.libraryOpen,
      themeMode: preferences.themeMode,
      collapsedLibraryGroups: preferences.collapsedLibraryGroups,
      helpOpen: false,
      exportOpen: false,
      notice: null,
      past: [],
      future: [],
      lastChange: { reason: "external", changedIds: [], seq: 0 },

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
            editingGroupId: inserted.every((el) => isInGroup(el, state.editingGroupId)) ? state.editingGroupId : null,
            tool: toolAfterInsert(state),
            past: pushPast(state.past, state.elements),
            future: [],
          };
        }),

      translateElements: (ids, dx, dy, options) =>
        setWithReason(options?.record === false ? "commit" : null, (state) => {
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
            ...sanitizeTransient(state, elements),
            past: pushPast(state.past, state.elements),
            future: [],
          };
        }),

      openBoard: (board) =>
        set((state) => ({
          name: board.name,
          elements: board.elements,
          viewport: board.viewport,
          selectedIds: [],
          editingGroupId: null,
          tool: toolAfterInsert(state),
          past: pushPast(state.past, state.elements),
          future: [],
        })),

      setBoardName: (value) => set((state) => ({ name: normalizeBoardName(value) ?? state.messages.content.untitledBoard })),

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

      updateScene: (patch, options) => {
        const history = options?.history ?? "clear";
        if (interactionDepth > 0) queuedScenes.push({ patch, history });
        else applyScene(patch, history);
      },

      resetHistory: () => rawSet({ past: [], future: [] }),

      beginInteraction: () => {
        interactionDepth += 1;
      },

      endInteraction: () => {
        if (interactionDepth === 0) return;
        interactionDepth -= 1;
        if (interactionDepth > 0) return;
        const queued = queuedScenes;
        queuedScenes = [];
        queued.forEach(({ patch, history }) => applyScene(patch, history));
      },

      undo: () =>
        setWithReason("undo", (state) => {
          const previous = state.past.at(-1);
          if (!previous) return {};
          return {
            elements: previous,
            ...sanitizeTransient(state, previous),
            past: state.past.slice(0, -1),
            future: [...state.future, state.elements],
          };
        }),

      redo: () =>
        setWithReason("redo", (state) => {
          const next = state.future.at(-1);
          if (!next) return {};
          return {
            elements: next,
            ...sanitizeTransient(state, next),
            past: pushPast(state.past, state.elements),
            future: state.future.slice(0, -1),
          };
        }),

      setSelection: (selectedIds) => set({ selectedIds }),
      setEditingGroup: (editingGroupId) => set({ editingGroupId }),
      setTableCell: (tableCell) => set({ tableCell }),
      setTableTextScope: (tableTextScope) => set({ tableTextScope }),
      exitEditingGroup: () => {
        const { elements, editingGroupId } = get();
        if (editingGroupId === null) return false;
        set({
          editingGroupId: getParentGroupId(elements, editingGroupId),
          selectedIds: getGroupMembers(elements, editingGroupId).map((el) => el.id),
        });
        return true;
      },
      groupSelection: () =>
        set((state) => {
          const elements = groupElements(state.elements, state.selectedIds, state.editingGroupId);
          if (!elements) return {};
          return { elements, past: pushPast(state.past, state.elements), future: [] };
        }),
      ungroupSelection: () =>
        set((state) => {
          const elements = ungroupElements(state.elements, state.selectedIds, state.editingGroupId);
          if (!elements) return {};
          return { elements, past: pushPast(state.past, state.elements), future: [] };
        }),
      reorderSelection: (direction) =>
        set((state) => {
          const elements = reorderElements(state.elements, state.selectedIds, state.editingGroupId, direction);
          if (!elements) return {};
          return { elements, past: pushPast(state.past, state.elements), future: [] };
        }),
      changePoolLanes: (change) =>
        set((state) => {
          const result =
            change === "add"
              ? addPoolLane(state.elements, state.selectedIds, state.messages.content.numberedLane)
              : removePoolLane(state.elements, state.selectedIds);
          if (!result) return {};
          return {
            elements: updateBoundArrows(result.elements, result.changedIds, state.elements),
            selectedIds: result.selectedIds,
            past: pushPast(state.past, state.elements),
            future: [],
          };
        }),
      setTool: (tool) => {
        if (!isToolAllowed(get().config, tool)) return;
        set(tool === "selection" ? { tool } : { tool, selectedIds: [], editingGroupId: null });
      },
      setMessages: (next) => {
        if (!sameMessages(get().messages, next)) rawSet({ messages: next });
      },
      setConfig: (next) =>
        set((state) => {
          if (sameConfig(state.config, next)) return {};
          const tool = isToolAllowed(next, state.tool) ? state.tool : fallbackTool(next);
          const cleared = next.readOnly || tool !== state.tool;
          return {
            config: next,
            tool,
            ...(cleared && { selectedIds: [], editingGroupId: null, tableCell: null }),
          };
        }),
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
          const target = hasCellTextPatch(patch) ? getCellTextTarget(state) : null;
          if (target) {
            const updated = setCellsTextStyle(target.table, target.range, patch);
            if (updated === target.table) return {};
            const elements = state.elements.map((el) => (el.id === updated.id ? updated : el));
            if (options?.record === false) return { elements };
            return { elements, past: pushPast(state.past, state.elements), future: [] };
          }
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
          const changedIds: string[] = [];
          const styled = state.elements.map((el) => {
            if (!ids.has(el.id)) return el;
            const next = applyStyle(el, patch);
            if (next !== el) changedIds.push(el.id);
            return next;
          });
          if (changedIds.length === 0) return { currentStyle };
          const elements = patch.corners === undefined ? styled : updateBoundArrows(styled, changedIds, state.elements);
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
      setLibraryOpen: (libraryOpen) => set({ libraryOpen }),
      setThemeMode: (themeMode) => set({ themeMode }),
      toggleLibraryGroup: (groupId) =>
        set((state) => ({
          collapsedLibraryGroups: state.collapsedLibraryGroups.includes(groupId)
            ? state.collapsedLibraryGroups.filter((id) => id !== groupId)
            : [...state.collapsedLibraryGroups, groupId],
        })),
      setViewportSize: (viewportSize) => set({ viewportSize }),
      setHelpOpen: (helpOpen) => set({ helpOpen }),
      setExportOpen: (exportOpen) => set({ exportOpen }),
      showNotice: (message, tone = "info") => set({ notice: { id: ++noticeCount, message, tone } }),
      dismissNotice: (id) => set((state) => (state.notice?.id === id ? { notice: null } : {})),
      panBy: (dx, dy) => set((state) => ({ viewport: panBy(state.viewport, dx, dy) })),
      zoomAt: (screenPoint, factor) =>
        set((state) => ({ viewport: zoomAt(state.viewport, screenPoint, factor) })),
      stepZoom: (direction) =>
        set((state) => ({
          viewport: zoomTo(state.viewport, screenCenter(state), nextZoomStep(state.viewport.zoom, direction, state.config.zoomSteps)),
        })),
      resetZoom: () => set((state) => ({ viewport: zoomTo(state.viewport, screenCenter(state), 1) })),
    };
  });
}

