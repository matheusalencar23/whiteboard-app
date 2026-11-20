import { useEffect, useMemo, useRef, useState } from "react";
import rough from "roughjs";
import { useFontsVersion } from "../../fonts";
import type { RoughCanvas } from "roughjs/bin/canvas";
import styles from "./Canvas.module.scss";
import type { Point } from "../../../lib/types";
import type {
  ArrowBinding,
  ArrowElement,
  BoardElement,
  BoxElementType,
  LabeledElement,
  CompartmentsElement,
  TableElement,
  TextElement,
  TextStyle,
} from "../../../lib/elements/types";
import { isLabeledElement } from "../../../lib/elements/types";
import {
  containsBounds,
  containsPoint,
  expandBounds,
  getBounds,
  getCenter,
  type Bounds,
} from "../../../lib/geometry/bounds";
import { distance, rotatePoint } from "../../../lib/geometry/distance";
import { constrainToSquare, snapAngleValue, snapToAngle } from "../../../lib/geometry/constrain";
import {
  createBoxElement,
  getElementAtPoint,
  getLabelArea,
  getLabelLayout,
  getLabelRotation,
  getLabelTextStyle,
  getLabelTargetAt,
  getElementBounds,
  getElementBox,
  resizeElement,
  translateElement,
} from "../../../lib/elements/registry";
import { createArrow, getArrowPoints, getLabelPositionAt, setArrowPoints } from "../../../lib/elements/shapes/arrow";
import {
  bindArrowEnd,
  findBinding,
  getBinding,
  moveElbowSegment,
  isSegmentFixed,
  releaseElbowSegment,
  removeArrowPoint,
  refreshArrow,
  releaseBindings,
  sameBinding,
  setBinding,
  type ArrowEnd,
} from "../../../lib/elements/bindings";
import { createFreedraw, setFreedrawPoints } from "../../../lib/elements/shapes/freedraw";
import { createText, resolveTextColor, setText } from "../../../lib/elements/shapes/text";
import {
  getSectionAt,
  getSectionTextArea,
  getSectionTextStyle,
  setSectionText,
} from "../../../lib/elements/shapes/compartments";
import {
  clampCell,
  createTableFromRows,
  getCellText,
  getMergeRange,
  getNextCell,
  isTitleCell,
  sameCell,
  getCellAt,
  getCellTextArea,
  getCellTextStyle,
  getColumnBorderAt,
  insertRow,
  parseTableText,
  setCellText,
  setColumnWidth,
  getColumnLefts,
  type CellPosition,
} from "../../../lib/elements/shapes/table";
import {
  ROTATION_HANDLE_DISTANCE,
  ROTATION_HANDLE_RADIUS,
  ROTATION_SNAP,
  getSelectionBounds,
  frameContains,
  getArrowHandleAt,
  getHandleAt,
  getHandleCursor,
  getSingleArrow,
  getSelectionFrame,
  isOnRotationHandle,
  resizeBounds,
  resizeElementsToBounds,
  resizeSingleElement,
  rotateElements,
  type Handle,
  type SelectionFrame,
} from "../../../lib/selection";
import { renderScene } from "../../../lib/render/renderScene";
import {
  getGroupMembers,
  getSelectableGroupId,
  getSelectionUnit,
  getUnitsInside,
  isInGroup,
} from "../../../lib/elements/groups";
import { toDegrees, type Measurement } from "../../../lib/render/measurement";
import { GRID_SIZE } from "../../../lib/render/grid";
import { screenToWorld, worldToScreen } from "../../../lib/viewport";
import { lineHeight } from "../../../lib/text";
import type { BoardStore } from "../../../store/boardStore";
import { useBoardStore, useBoardStoreApi } from "../../../store/boardStoreContext";
import { TextEditor, type TextEditorLayout } from "../TextEditor/TextEditor";
import { useTheme } from "../../useColorScheme";
import { adaptColor } from "../../../lib/colors";
import { StyleBar, type StyleBarPlacement } from "../StyleBar/StyleBar";
import { isTypingTarget } from "../useShortcuts";
import { useClipboard } from "./useClipboard";
import { focusBoard, useBoardRoot } from "../boardRoot";
import { isInPortal } from "../../../ui/portal";
import { findLibraryItem } from "../../../lib/elements/library";
import { LIBRARY_DRAG_TYPE, insertLibraryItem } from "../Library/libraryActions";

const ZOOM_SENSITIVITY = 0.005;
const MAX_WHEEL_DELTA = 50;
const HIT_TOLERANCE = 6;
const FREEDRAW_MIN_DISTANCE = 1;
const BINDING_TOLERANCE = 8;
const CONNECTION_SNAP_DISTANCE = 8;
const COLUMN_BORDER_TOLERANCE = 4;

const BOX_TOOLS: readonly string[] = ["rectangle", "ellipse", "diamond"] satisfies BoxElementType[];

type Interaction =
  | { kind: "panning"; last: Point }
  | {
      kind: "creating";
      start: Point;
      startBinding: ArrowBinding | null;
    }
  | { kind: "freedrawing"; points: Point[] }
  | {
      kind: "moving";
      start: Point;
      originals: BoardElement[];
      before: BoardElement[];
    }
  | {
      kind: "resizing";
      handle: Handle;
      start: Point;
      bounds: Bounds;
      originals: BoardElement[];
      before: BoardElement[];
    }
  | {
      kind: "rotating";
      frame: SelectionFrame;
      startAngle: number;
      originals: BoardElement[];
      before: BoardElement[];
    }
  | {
      kind: "draggingPoint";
      arrow: ArrowElement;
      index: number;
      original: ArrowElement;
      before: BoardElement[];
    }
  | {
      kind: "draggingSegment";
      original: ArrowElement;
      index: number;
      before: BoardElement[];
    }
  | {
      kind: "draggingLabel";
      original: ArrowElement;
      before: BoardElement[];
    }
  | {
      kind: "draggingEndpoint";
      end: ArrowEnd;
      original: ArrowElement;
      before: BoardElement[];
    }
  | {
      kind: "resizingColumn";
      column: number;
      original: TableElement;
      before: BoardElement[];
    }
  | { kind: "boxSelecting"; start: Point; initialSelection: string[] };

type Measuring = { kind: "size" } | { kind: "angle"; groupAngle: number; at: Point };

function getMeasurement(measuring: Measuring | null, selected: BoardElement[]): Measurement | null {
  if (!measuring || selected.length === 0) return null;
  if (measuring.kind === "angle") {
    const radians = selected.length === 1 ? selected[0].rotation : measuring.groupAngle;
    return { kind: "angle", degrees: toDegrees(radians), at: measuring.at };
  }
  const box = selected.length === 1 ? getElementBox(selected[0]) : getSelectionBounds(selected);
  return box && { kind: "size", width: box.width, height: box.height };
}

type Editing =
  | {
      kind: "text";
      element: TextElement;
      isNew: boolean;
    }
  | { kind: "label"; element: LabeledElement }
  | { kind: "section"; element: CompartmentsElement; index: number }
  | { kind: "cell"; element: TableElement; cell: CellPosition };

function getScreenPoint(e: { nativeEvent: MouseEvent }): Point {
  return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
}

function getSelectedElements(boardStore: BoardStore): BoardElement[] {
  const { elements, selectedIds } = boardStore.getState();
  const ids = new Set(selectedIds);
  return elements.filter((el) => ids.has(el.id));
}

function findBindingAt(boardStore: BoardStore, world: Point) {
  const { elements, viewport } = boardStore.getState();
  const { zoom } = viewport;
  return findBinding(
    elements,
    world,
    BINDING_TOLERANCE / zoom,
    CONNECTION_SNAP_DISTANCE / zoom,
  );
}

function isOnArrowLabel(arrow: ArrowElement, point: Point, tolerance: number): boolean {
  const box = getLabelLayout(arrow)?.box;
  return box !== undefined && containsPoint(expandBounds(box, tolerance), point);
}

function detachFromStaying(moved: BoardElement[]): BoardElement[] {
  return releaseBindings(moved, new Set(moved.map((el) => el.id)));
}

function liveEditingElement(editing: Editing, text: string): BoardElement {
  if (editing.kind === "section") return setSectionText(editing.element, editing.index, text);
  if (editing.kind === "cell") return setCellText(editing.element, editing.cell, text);
  return editing.element;
}

function toLocal(element: BoardElement, world: Point): Point {
  return rotatePoint(world, getCenter(element), -element.rotation);
}

function getSingleTable(boardStore: BoardStore): TableElement | null {
  const [element, ...rest] = getSelectedElements(boardStore);
  return element?.type === "table" && rest.length === 0 ? element : null;
}

function getColumnBorderHit(boardStore: BoardStore, world: Point, zoom: number): { table: TableElement; column: number } | null {
  const table = getSingleTable(boardStore);
  if (!table) return null;
  const column = getColumnBorderAt(table, toLocal(table, world), COLUMN_BORDER_TOLERANCE / zoom);
  return column === null ? null : { table, column };
}

function editorLayout(editing: Editing, text: string): TextEditorLayout {
  const { rotation } = editing.element;
  if (editing.kind === "text") {
    const el = editing.element;
    const position = rotatePoint({ x: el.x, y: el.y }, getCenter(el), rotation);
    return { kind: "free", position, rotation };
  }
  if (editing.kind === "section") {
    const live = setSectionText(editing.element, editing.index, text);
    return { kind: "label", area: getSectionTextArea(live, editing.index), rotation, pivot: getCenter(live) };
  }
  if (editing.kind === "cell") {
    const live = setCellText(editing.element, editing.cell, text);
    return { kind: "label", area: getCellTextArea(live, editing.cell), rotation, pivot: getCenter(live) };
  }
  const area = getLabelArea(editing.element) ?? editing.element;
  const labelRotation = getLabelRotation(editing.element);
  if (labelRotation === 0) return { kind: "label", area, rotation, pivot: getCenter(editing.element) };
  const pivot = rotatePoint(getCenter(area), getCenter(editing.element), rotation);
  const turned = { ...area, x: pivot.x - area.width / 2, y: pivot.y - area.height / 2 };
  return { kind: "label", area: turned, rotation: rotation + labelRotation, pivot };
}

function editorKey(editing: Editing): string {
  if (editing.kind === "section") return `${editing.element.id}:${editing.index}`;
  if (editing.kind === "cell") return `${editing.element.id}:${editing.cell.row}:${editing.cell.column}`;
  return editing.element.id;
}

function activeCellOf(boardStore: BoardStore, table: TableElement): CellPosition {
  const { tableCell } = boardStore.getState();
  if (tableCell?.elementId !== table.id) return { row: 0, column: 0 };
  return clampCell(table, tableCell);
}

function editorInitialText(editing: Editing): string {
  if (editing.kind === "text") return editing.element.text;
  if (editing.kind === "section") return editing.element.sections[editing.index].text;
  if (editing.kind === "cell") return getCellText(editing.element, editing.cell);
  return editing.element.label?.text ?? "";
}

function withCurrentStyle<T extends BoardElement>(boardStore: BoardStore, element: T): T {
  return { ...element, style: { ...boardStore.getState().currentStyle } };
}

function createStyledText(boardStore: BoardStore, position: Point, text = ""): TextElement {
  const { currentStyle, currentTextStyle } = boardStore.getState();
  const textStyle = { ...currentTextStyle, color: currentTextStyle.color ?? currentStyle.strokeColor };
  return withCurrentStyle(boardStore, createText(position, textStyle, text));
}

function createPastedText(boardStore: BoardStore, raw: string, center: Point): BoardElement {
  const rows = parseTableText(raw);
  if (rows) {
    const { currentTextStyle } = boardStore.getState();
    const table = withCurrentStyle(boardStore, createTableFromRows(rows, center, { ...currentTextStyle, verticalAlign: "middle" }));
    return { ...table, style: { ...table.style, fillStyle: "solid" } };
  }
  const text = raw.replace(/\r\n?/g, "\n").replace(/\s+$/, "");
  const element = createStyledText(boardStore, center, text);
  return { ...element, x: center.x - element.width / 2, y: center.y - element.height / 2 };
}

function labelTextStyle(boardStore: BoardStore, element: LabeledElement): TextStyle {
  return (
    element.label?.textStyle ?? {
      ...boardStore.getState().currentTextStyle,
      align: "center",
      verticalAlign: "middle",
    }
  );
}

function editorTextStyle(boardStore: BoardStore, editing: Editing): TextStyle {
  if (editing.kind === "text") return editing.element.textStyle;
  if (editing.kind === "section") return getSectionTextStyle(editing.element, editing.index);
  if (editing.kind === "cell") return getCellTextStyle(editing.element, editing.cell.row, editing.cell.column);
  return getLabelTextStyle(editing.element, labelTextStyle(boardStore, editing.element));
}

function currentEditingGroup(boardStore: BoardStore, element: BoardElement): string | null {
  const store = boardStore.getState();
  if (store.editingGroupId !== null && !isInGroup(element, store.editingGroupId)) {
    store.setEditingGroup(null);
  }
  return boardStore.getState().editingGroupId;
}

function hasSize(element: BoardElement): boolean {
  if (element.type === "arrow") return element.width > 0 || element.height > 0;
  return element.width > 0 && element.height > 0;
}

export function Canvas() {
  const boardStore = useBoardStoreApi();
  const rootRef = useBoardRoot();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roughRef = useRef<RoughCanvas | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const holdingInteractionRef = useRef(false);
  const spacePressedRef = useRef(false);
  const draftRef = useRef<BoardElement | null>(null);

  const elements = useBoardStore((s) => s.elements);
  const selectedIds = useBoardStore((s) => s.selectedIds);
  const viewport = useBoardStore((s) => s.viewport);
  const showGrid = useBoardStore((s) => s.showGrid);
  const gridStyle = useBoardStore((s) => s.gridStyle);
  const theme = useTheme();
  const tool = useBoardStore((s) => s.tool);
  const editingGroupId = useBoardStore((s) => s.editingGroupId);

  const [draft, setDraftState] = useState<BoardElement | null>(null);
  const [selectionBox, setSelectionBox] = useState<Bounds | null>(null);
  const [frameOverride, setFrameOverride] = useState<SelectionFrame | null>(null);
  const [measuring, setMeasuring] = useState<Measuring | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isInteracting, setIsInteracting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [hoverCursor, setHoverCursor] = useState("default");
  const [bindingHint, setBindingHintState] = useState<ArrowBinding | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const fontsLoaded = useFontsVersion();

  function setBindingHint(next: ArrowBinding | null) {
    setBindingHintState((current) => (sameBinding(current, next) ? current : next));
  }

  const lastPointerRef = useRef<Point | null>(null);
  const hoverPointRef = useRef<Point | null>(null);
  const updateInteractionRef = useRef<(world: Point, shiftKey: boolean) => void>(() => {});
  const editSelectionRef = useRef<() => boolean>(() => false);

  function setDraft(element: BoardElement | null) {
    draftRef.current = element;
    setDraftState(element);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    roughRef.current = rough.canvas(canvas);

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
      boardStore.getState().setViewportSize({ width, height });
    });
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [boardStore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const { panBy, zoomAt } = boardStore.getState();
      const scale = e.deltaMode === 1 ? 16 : 1;
      const dx = e.deltaX * scale;
      const dy = e.deltaY * scale;

      if (e.ctrlKey || e.metaKey) {
        const delta = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, dy));
        zoomAt({ x: e.offsetX, y: e.offsetY }, Math.exp(-delta * ZOOM_SENSITIVITY));
      } else if (e.shiftKey) {
        panBy(-dy, -dx);
      } else {
        panBy(-dx, -dy);
      }
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [boardStore]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    function reapplyShift(e: KeyboardEvent) {
      if (e.key !== "Shift" || e.repeat || !lastPointerRef.current) return;
      updateInteractionRef.current(lastPointerRef.current, e.type === "keydown");
    }
    function handleKeyDown(e: KeyboardEvent) {
      reapplyShift(e);
      if (isTypingTarget(e.target) || isInPortal(e.target)) return;
      if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement) && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (editSelectionRef.current()) e.preventDefault();
        return;
      }
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      spacePressedRef.current = true;
      setSpacePressed(true);
    }
    function releaseSpace() {
      spacePressedRef.current = false;
      setSpacePressed(false);
    }
    function handleKeyUp(e: KeyboardEvent) {
      reapplyShift(e);
      if (e.code === "Space") releaseSpace();
    }
    function handleFocusOut(e: FocusEvent) {
      if (!root?.contains(e.relatedTarget as Node | null)) releaseSpace();
    }
    root.addEventListener("keydown", handleKeyDown);
    root.addEventListener("keyup", handleKeyUp);
    root.addEventListener("focusout", handleFocusOut);
    return () => {
      root.removeEventListener("keydown", handleKeyDown);
      root.removeEventListener("keyup", handleKeyUp);
      root.removeEventListener("focusout", handleFocusOut);
    };
  }, [rootRef]);

  useClipboard({
    getPastePosition: () => {
      const screen = hoverPointRef.current ?? { x: size.width / 2, y: size.height / 2 };
      return screenToWorld(screen, boardStore.getState().viewport);
    },
    createPastedText: (raw, center) => createPastedText(boardStore, raw, center),
  });

  const scene = useMemo(() => {
    let visible = elements;
    if (editing?.kind === "text") {
      visible = elements.filter((el) => el.id !== editing.element.id);
    } else if (editing?.kind === "label") {
      const textStyle = labelTextStyle(boardStore, editing.element);
      visible = elements.map((el) =>
        el.id === editing.element.id && isLabeledElement(el)
          ? { ...el, label: { text: editingText, textStyle } }
          : el,
      );
    } else if (editing?.kind === "section" || editing?.kind === "cell") {
      const live = liveEditingElement(editing, editingText);
      visible = elements.map((el) => (el.id === live.id ? live : el));
    }
    return draft ? [...visible, draft] : visible;
  }, [boardStore, elements, draft, editing, editingText]);

  const selected = useMemo(() => {
    const ids = new Set(selectedIds);
    return elements.filter((el) => ids.has(el.id));
  }, [elements, selectedIds]);

  const editingGroupBounds = useMemo(
    () => (editingGroupId ? getSelectionBounds(getGroupMembers(elements, editingGroupId)) : null),
    [elements, editingGroupId],
  );

  const tableCell = useBoardStore((s) => s.tableCell);
  const activeCell = useMemo(() => {
    const [table, ...rest] = selected;
    if (table?.type !== "table" || rest.length > 0 || tableCell?.elementId !== table.id) return null;
    const cell = clampCell(table, tableCell);
    const extent = tableCell.extent && clampCell(table, tableCell.extent);
    return { table, cell, range: extent && !isTitleCell(cell) && !isTitleCell(extent) ? getMergeRange(table, cell, extent) : null };
  }, [selected, tableCell]);

  const showBindingTarget = tool === "arrow" || isInteracting;
  const bindingTarget = useMemo(
    () =>
      (showBindingTarget && bindingHint && elements.find((el) => el.id === bindingHint.elementId)) ||
      null,
    [elements, bindingHint, showBindingTarget],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const rc = roughRef.current;
    if (!canvas || !ctx || !rc) return;

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(size.width * dpr);
    const pixelHeight = Math.round(size.height * dpr);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

    renderScene(
      ctx,
      rc,
      scene,
      {
        selected,
        selectionBox,
        showHandles: !isInteracting,
        bindingTarget,
        bindingAnchor: bindingHint && (bindingHint.fixed || isInteracting) ? bindingHint.anchor : null,
        bindingFixed: bindingHint?.fixed ?? false,
        frameOverride,
        hiddenText:
          editing?.kind === "label"
            ? { id: editing.element.id, text: "label" }
            : editing?.kind === "section"
              ? { id: editing.element.id, text: editing.index }
              : editing?.kind === "cell"
                ? { id: editing.element.id, text: editing.cell }
                : null,
        editingGroup: editingGroupBounds,
        measurement: getMeasurement(measuring, selected),
        activeCell,
      },
      viewport,
      dpr,
      showGrid ? { size: GRID_SIZE, style: gridStyle } : null,
      theme,
    );
  }, [
    scene,
    selected,
    selectionBox,
    frameOverride,
    measuring,
    editing,
    showGrid,
    gridStyle,
    isInteracting,
    bindingTarget,
    bindingHint,
    editingGroupBounds,
    activeCell,
    viewport,
    size,
    fontsLoaded,
    theme,
  ]);

  const isEditing = editing !== null;

  useEffect(() => {
    if (!isEditing) return;
    boardStore.getState().beginInteraction();
    return () => boardStore.getState().endInteraction();
  }, [boardStore, isEditing]);

  function startEditingText(element: TextElement, isNew: boolean) {
    boardStore.getState().setSelection([]);
    setEditing({ kind: "text", element, isNew });
  }

  function startEditingLabel(element: LabeledElement) {
    boardStore.getState().setSelection([]);
    setEditingText(element.label?.text ?? "");
    setEditing({ kind: "label", element });
  }

  function startEditingSection(element: CompartmentsElement, index: number) {
    boardStore.getState().setSelection([]);
    setEditingText(element.sections[index].text);
    setEditing({ kind: "section", element, index });
  }

  function startEditingCell(element: TableElement, cell: CellPosition) {
    const store = boardStore.getState();
    store.setSelection([]);
    store.setTableCell({ elementId: element.id, ...cell });
    setEditingText(getCellText(element, cell));
    setEditing({ kind: "cell", element, cell });
  }

  function finishEditing(text: string) {
    const current = editing;
    const active = document.activeElement;
    if (isTypingTarget(active) && rootRef.current?.contains(active)) focusBoard(rootRef);
    setEditing(null);
    if (!current) return;
    if (current.kind === "label") finishEditingLabel(current.element.id, text);
    else if (current.kind === "section") finishEditingSection(current.element.id, current.index, text);
    else if (current.kind === "cell") finishEditingCell(current.element.id, current.cell, text);
    else finishEditingText(current, text);
  }

  function commitCellText(id: string, cell: CellPosition, text: string, extend: boolean): TableElement | null {
    const store = boardStore.getState();
    const table = store.elements.find((el) => el.id === id);
    if (table?.type !== "table" || sameCell(clampCell(table, cell), cell) === false) return null;
    let updated = setCellText(table, cell, text);
    if (extend) updated = insertRow(updated, updated.cells.length);
    if (updated !== table) store.replaceElement(updated);
    return updated;
  }

  function finishEditingCell(id: string, cell: CellPosition, text: string) {
    const store = boardStore.getState();
    if (commitCellText(id, cell, text, false)) store.setSelection([id]);
    store.setTool("selection");
  }

  function navigateCell(text: string, backwards: boolean) {
    const current = editing;
    if (current?.kind !== "cell") return;
    const target = getNextCell(current.element, current.cell, backwards);
    if (!target) {
      finishEditing(text);
      return;
    }
    const extend = target.row >= current.element.cells.length;
    const updated = commitCellText(current.element.id, current.cell, text, extend);
    if (!updated) {
      setEditing(null);
      return;
    }
    startEditingCell(updated, target);
  }

  function finishEditingSection(id: string, index: number, text: string) {
    const store = boardStore.getState();
    const shape = store.elements.find((el) => el.id === id);
    if (shape?.type === "compartments" && index < shape.sections.length) {
      const updated = setSectionText(shape, index, text);
      if (updated !== shape) store.replaceElement(updated);
      store.setSelection([id]);
    }
    store.setTool("selection");
  }

  function finishEditingLabel(id: string, text: string) {
    const store = boardStore.getState();
    const shape = store.elements.find((el) => el.id === id);
    if (shape && isLabeledElement(shape)) {
      const isEmpty = text.trim() === "";
      if (isEmpty && shape.label) {
        store.replaceElement({ ...shape, label: undefined });
      } else if (!isEmpty && text !== shape.label?.text) {
        store.replaceElement({ ...shape, label: { text, textStyle: labelTextStyle(boardStore, shape) } });
      }
      store.setSelection([id]);
    }
    store.setTool("selection");
  }

  function finishEditingText(current: Extract<Editing, { kind: "text" }>, text: string) {
    const store = boardStore.getState();
    const isEmpty = text.trim() === "";
    const updated = setText(current.element, text);

    if (current.isNew) {
      if (!isEmpty) store.addElement(updated, { select: true });
    } else if (isEmpty) {
      store.deleteElements([current.element.id]);
    } else {
      if (text !== current.element.text) store.replaceElement(updated);
      store.setSelection([current.element.id]);
    }
    store.setTool("selection");
  }

  function startSelectionInteraction(world: Point, shiftKey: boolean) {
    const store = boardStore.getState();
    const { zoom } = store.viewport;
    const tolerance = HIT_TOLERANCE / zoom;
    const selectedNow = getSelectedElements(boardStore);
    const frame = getSelectionFrame(selectedNow);
    const singleArrow = getSingleArrow(selectedNow);

    const arrowHandle = singleArrow && getArrowHandleAt(singleArrow, world, zoom);
    if (singleArrow && !arrowHandle && isOnArrowLabel(singleArrow, world, tolerance)) {
      interactionRef.current = { kind: "draggingLabel", original: singleArrow, before: store.elements };
      return;
    }
    if (singleArrow && arrowHandle) {
      if (arrowHandle.kind === "end") {
        interactionRef.current = {
          kind: "draggingEndpoint",
          end: arrowHandle.end,
          original: singleArrow,
          before: store.elements,
        };
        return;
      }
      if (arrowHandle.kind === "segment") {
        interactionRef.current = {
          kind: "draggingSegment",
          original: singleArrow,
          index: arrowHandle.index,
          before: store.elements,
        };
        return;
      }
      let arrow = singleArrow;
      let index = arrowHandle.index;
      if (arrowHandle.kind === "midpoint") {
        const points = getArrowPoints(singleArrow);
        index = arrowHandle.index + 1;
        points.splice(index, 0, arrowHandle.position);
        arrow = setArrowPoints(singleArrow, points);
      }
      interactionRef.current = {
        kind: "draggingPoint",
        arrow,
        index,
        original: singleArrow,
        before: store.elements,
      };
      return;
    }

    if (singleArrow && isOnArrowLabel(singleArrow, world, HIT_TOLERANCE / zoom)) return setHoverCursor("grab");
    const boxFrame = singleArrow ? null : frame;
    if (boxFrame && isOnRotationHandle(world, boxFrame, zoom)) {
      const center = getCenter(boxFrame.box);
      interactionRef.current = {
        kind: "rotating",
        frame: boxFrame,
        startAngle: Math.atan2(world.y - center.y, world.x - center.x),
        originals: selectedNow,
        before: store.elements,
      };
      setHoverCursor("grabbing");
      return;
    }

    const handle = boxFrame && getHandleAt(world, boxFrame, zoom);
    if (boxFrame && handle) {
      interactionRef.current = {
        kind: "resizing",
        handle,
        start: world,
        bounds: boxFrame.box,
        originals: selectedNow,
        before: store.elements,
      };
      return;
    }

    const border = !shiftKey && getColumnBorderHit(boardStore, world, zoom);
    if (border) {
      interactionRef.current = {
        kind: "resizingColumn",
        column: border.column,
        original: border.table,
        before: store.elements,
      };
      return;
    }

    const hit = getElementAtPoint(store.elements, world, tolerance);
    if (hit?.type === "table") {
      const cell = getCellAt(hit, toLocal(hit, world));
      const cursor = store.tableCell;
      if (shiftKey && getSingleTable(boardStore)?.id === hit.id && cursor?.elementId === hit.id) {
        store.setTableCell({ elementId: hit.id, row: cursor.row, column: cursor.column, extent: cell });
        return;
      }
      store.setTableCell({ elementId: hit.id, ...cell });
    }
    if (hit) {
      const unit = getSelectionUnit(store.elements, hit, currentEditingGroup(boardStore, hit));
      const isSelected = store.selectedIds.includes(hit.id);
      if (shiftKey) {
        if (isSelected) {
          const removed = new Set(unit);
          store.setSelection(store.selectedIds.filter((id) => !removed.has(id)));
          return;
        }
        store.setSelection([...new Set([...store.selectedIds, ...unit])]);
      } else if (!isSelected) {
        store.setSelection(unit);
      }
      interactionRef.current = {
        kind: "moving",
        start: world,
        originals: getSelectedElements(boardStore),
        before: store.elements,
      };
      return;
    }

    if (!shiftKey && frame && frameContains(frame, world, zoom)) {
      interactionRef.current = {
        kind: "moving",
        start: world,
        originals: selectedNow,
        before: store.elements,
      };
      return;
    }

    const initialSelection = shiftKey ? store.selectedIds : [];
    if (!shiftKey) {
      store.setSelection([]);
      store.setEditingGroup(null);
    }
    interactionRef.current = { kind: "boxSelecting", start: world, initialSelection };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    focusBoard(rootRef);
    if (editing) return;

    const store = boardStore.getState();
    const screen = getScreenPoint(e);
    const wantsPan =
      e.button === 1 || (e.button === 0 && (store.tool === "hand" || spacePressedRef.current));

    if (!wantsPan && e.button !== 0) return;
    e.preventDefault();

    const world = screenToWorld(screen, store.viewport);

    if (!wantsPan && store.tool === "text") {
      startEditingText(createStyledText(boardStore, world), true);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsInteracting(true);
    holdInteraction();

    if (wantsPan) {
      interactionRef.current = { kind: "panning", last: screen };
      setIsPanning(true);
    } else if (store.tool === "selection") {
      startSelectionInteraction(world, e.shiftKey);
    } else if (store.tool === "freedraw") {
      interactionRef.current = { kind: "freedrawing", points: [world] };
      setDraft(withCurrentStyle(boardStore, createFreedraw([world])));
    } else if (store.tool === "arrow") {
      const startBinding = findBindingAt(boardStore, world);
      interactionRef.current = { kind: "creating", start: world, startBinding };
      setDraft({
        ...withCurrentStyle(boardStore, createArrow(world, world, store.arrowRouting, store.arrowheads)),
        startBinding,
      });
      setBindingHint(startBinding);
    } else if (BOX_TOOLS.includes(store.tool)) {
      interactionRef.current = { kind: "creating", start: world, startBinding: null };
      setDraft(withCurrentStyle(boardStore, createBoxElement(store.tool as BoxElementType, world, world)));
    }
  }

  function updateHoverCursor(world: Point) {
    const store = boardStore.getState();
    const { zoom } = store.viewport;
    const selectedNow = getSelectedElements(boardStore);
    const frame = getSelectionFrame(selectedNow);
    const singleArrow = getSingleArrow(selectedNow);

    const arrowHandle = singleArrow && getArrowHandleAt(singleArrow, world, zoom);
    if (arrowHandle) {
      if (arrowHandle.kind === "segment") {
        return setHoverCursor(arrowHandle.axis === "x" ? "ns-resize" : "ew-resize");
      }
      return setHoverCursor("pointer");
    }
    const boxFrame = singleArrow ? null : frame;
    if (boxFrame && isOnRotationHandle(world, boxFrame, zoom)) return setHoverCursor("grab");
    const handle = boxFrame && getHandleAt(world, boxFrame, zoom);
    if (boxFrame && handle) return setHoverCursor(getHandleCursor(handle, boxFrame.rotation));

    if (getColumnBorderHit(boardStore, world, zoom)) return setHoverCursor("col-resize");
    const overSelection = frame && frameContains(frame, world, zoom);
    const overElement = getElementAtPoint(store.elements, world, HIT_TOLERANCE / zoom);
    setHoverCursor(overSelection || overElement ? "move" : "default");
  }

  function handlePointerMove(e: React.PointerEvent) {
    const store = boardStore.getState();
    const screen = getScreenPoint(e);
    hoverPointRef.current = screen;
    const world = screenToWorld(screen, store.viewport);
    const interaction = interactionRef.current;

    if (!interaction) {
      if (store.tool === "selection" && !editing) updateHoverCursor(world);
      if (store.tool === "arrow") setBindingHint(findBindingAt(boardStore, world));
      return;
    }

    if (interaction.kind === "panning") {
      store.panBy(screen.x - interaction.last.x, screen.y - interaction.last.y);
      interaction.last = screen;
      return;
    }

    lastPointerRef.current = world;
    updateInteraction(world, e.shiftKey);
  }

  function updateInteraction(world: Point, shiftKey: boolean) {
    const store = boardStore.getState();
    const interaction = interactionRef.current;
    if (!interaction) return;

    switch (interaction.kind) {
      case "creating": {
        const current = draftRef.current;
        if (!current) break;
        if (current.type !== "arrow") {
          const corner = shiftKey ? constrainToSquare(interaction.start, world) : world;
          setDraft(resizeElement(current, getBounds([interaction.start, corner])));
          break;
        }
        const target = shiftKey ? snapToAngle(interaction.start, world) : world;
        const binding = findBindingAt(boardStore, target);
        const base = setBinding(
          setArrowPoints(current, [interaction.start, target]),
          "start",
          interaction.startBinding,
        );
        const byId = new Map(store.elements.map((el) => [el.id, el]));
        const refreshed = refreshArrow(bindArrowEnd(base, "end", binding), byId);
        setDraft(refreshed);
        setBindingHint(refreshed.endBinding);
        break;
      }

      case "draggingPoint": {
        const points = getArrowPoints(interaction.arrow);
        const previous = points[interaction.index - 1];
        points[interaction.index] = shiftKey ? snapToAngle(previous, world) : world;
        store.updateElements([setArrowPoints(interaction.arrow, points)]);
        break;
      }

      case "draggingLabel": {
        const { original } = interaction;
        store.updateElements([{ ...original, labelPosition: getLabelPositionAt(original, world) }]);
        break;
      }

      case "draggingSegment":
        store.updateElements([moveElbowSegment(interaction.original, interaction.index, world)]);
        break;

      case "draggingEndpoint": {
        const { original, end } = interaction;
        const points = getArrowPoints(original);
        const index = end === "start" ? 0 : points.length - 1;
        const neighbor = points[end === "start" ? 1 : index - 1];
        const target = shiftKey && original.routing !== "elbow" ? snapToAngle(neighbor, world) : world;
        const binding = findBindingAt(boardStore, target);
        points[index] = target;
        const byId = new Map(store.elements.map((el) => [el.id, el]));
        const arrow = bindArrowEnd(setArrowPoints(original, points), end, binding);
        const refreshed = refreshArrow(arrow, byId);
        store.updateElements([refreshed]);
        setBindingHint(getBinding(refreshed, end));
        break;
      }

      case "freedrawing": {
        const current = draftRef.current;
        const last = interaction.points[interaction.points.length - 1];
        if (current?.type !== "freedraw") break;
        if (distance(last, world) < FREEDRAW_MIN_DISTANCE / store.viewport.zoom) break;
        interaction.points.push(world);
        setDraft(setFreedrawPoints(current, interaction.points));
        break;
      }

      case "moving": {
        const dx = world.x - interaction.start.x;
        const dy = world.y - interaction.start.y;
        if (dx === 0 && dy === 0) break;
        const moved = interaction.originals.map((el) => translateElement(el, dx, dy));
        store.updateElements(detachFromStaying(moved));
        break;
      }

      case "resizing": {
        const delta = { x: world.x - interaction.start.x, y: world.y - interaction.start.y };
        const { originals, handle, bounds } = interaction;
        if (originals.length === 1) {
          store.updateElements([resizeSingleElement(originals[0], handle, delta, shiftKey)]);
          setMeasuring({ kind: "size" });
          break;
        }
        const next = resizeBounds(bounds, handle, delta.x, delta.y, shiftKey);
        const resized = resizeElementsToBounds(originals, bounds, next);
        store.updateElements(detachFromStaying(resized));
        setMeasuring({ kind: "size" });
        break;
      }

      case "rotating": {
        const { frame, originals } = interaction;
        const center = getCenter(frame.box);
        let angle = Math.atan2(world.y - center.y, world.x - center.x) - interaction.startAngle;
        if (shiftKey) angle = snapAngleValue(frame.rotation + angle, ROTATION_SNAP) - frame.rotation;
        store.updateElements(detachFromStaying(rotateElements(originals, center, angle)));
        if (originals.length > 1) setFrameOverride({ box: frame.box, rotation: angle });
        setMeasuring({ kind: "angle", groupAngle: angle, at: world });
        break;
      }

      case "resizingColumn": {
        const { original, column } = interaction;
        const left = getColumnLefts(original)[column];
        store.updateElements([setColumnWidth(original, column, toLocal(original, world).x - left)]);
        break;
      }

      case "boxSelecting": {
        const box = getBounds([interaction.start, world]);
        setSelectionBox(box);
        const inside = getUnitsInside(
          store.elements,
          store.elements.filter((el) => containsBounds(box, getElementBounds(el))).map((el) => el.id),
          store.editingGroupId,
        );
        store.setSelection([...new Set([...interaction.initialSelection, ...inside])]);
        break;
      }
    }
  }

  function editSelection(): boolean {
    const store = boardStore.getState();
    if (store.tool !== "selection" || editing || interactionRef.current) return false;
    const [element, ...rest] = getSelectedElements(boardStore);
    if (!element || rest.length > 0) return false;
    if (element.type === "text") startEditingText(element, false);
    else if (element.type === "compartments") startEditingSection(element, 0);
    else if (element.type === "table") startEditingCell(element, activeCellOf(boardStore, element));
    else if (isLabeledElement(element)) startEditingLabel(element);
    else return false;
    return true;
  }

  useEffect(() => {
    updateInteractionRef.current = updateInteraction;
    editSelectionRef.current = editSelection;
  });

  function holdInteraction() {
    if (holdingInteractionRef.current) return;
    holdingInteractionRef.current = true;
    boardStore.getState().beginInteraction();
  }

  function releaseInteraction() {
    if (!holdingInteractionRef.current) return;
    holdingInteractionRef.current = false;
    boardStore.getState().endInteraction();
  }

  function endInteraction() {
    interactionRef.current = null;
    lastPointerRef.current = null;
    setDraft(null);
    setSelectionBox(null);
    setFrameOverride(null);
    setMeasuring(null);
    setIsInteracting(false);
    setIsPanning(false);
    setBindingHint(null);
  }

  function handlePointerUp() {
    const interaction = interactionRef.current;
    const draftElement = draftRef.current;
    const store = boardStore.getState();
    endInteraction();
    if (!interaction) {
      releaseInteraction();
      return;
    }

    switch (interaction.kind) {
      case "creating":
        if (draftElement && hasSize(draftElement)) {
          store.addElement(draftElement, { select: true });
          store.setTool("selection");
        }
        break;

      case "freedrawing":
        if (draftElement) store.addElement(draftElement);
        break;

      case "moving":
      case "resizing":
      case "rotating":
      case "draggingEndpoint":
      case "draggingPoint":
      case "draggingSegment":
      case "draggingLabel":
      case "resizingColumn":
        store.commitHistory(interaction.before);
        break;
    }
    releaseInteraction();
  }

  function handlePointerCancel() {
    const interaction = interactionRef.current;
    if (
      interaction?.kind === "moving" ||
      interaction?.kind === "resizing" ||
      interaction?.kind === "rotating"
    ) {
      boardStore.getState().updateElements(interaction.originals);
    } else if (
      interaction?.kind === "draggingEndpoint" ||
      interaction?.kind === "draggingPoint" ||
      interaction?.kind === "draggingSegment" ||
      interaction?.kind === "draggingLabel" ||
      interaction?.kind === "resizingColumn"
    ) {
      boardStore.getState().updateElements([interaction.original]);
    }
    endInteraction();
    releaseInteraction();
  }

  function handleArrowHandleDoubleClick(world: Point): boolean {
    const store = boardStore.getState();
    const arrow = getSingleArrow(getSelectedElements(boardStore));
    const handle = arrow && getArrowHandleAt(arrow, world, store.viewport.zoom);
    if (!arrow || !handle) return false;

    const byId = new Map(store.elements.map((el) => [el.id, el]));
    if (handle.kind === "point") {
      store.replaceElement(removeArrowPoint(arrow, handle.index, byId));
    } else if (handle.kind === "segment" && isSegmentFixed(arrow, handle.index)) {
      store.replaceElement(releaseElbowSegment(arrow, handle.index, byId));
    } else if (handle.kind !== "end") {
      return false;
    }
    return true;
  }

  function handleDoubleClick(e: React.MouseEvent) {
    const store = boardStore.getState();
    if (store.tool !== "selection" || editing) return;

    const world = screenToWorld(getScreenPoint(e), store.viewport);
    if (handleArrowHandleDoubleClick(world)) return;
    const tolerance = HIT_TOLERANCE / store.viewport.zoom;
    const hit = getElementAtPoint(store.elements, world, tolerance);
    const shape = hit ? hit : getLabelTargetAt(store.elements, world, 0);

    const groupId = shape && getSelectableGroupId(shape, currentEditingGroup(boardStore, shape));
    if (shape && groupId) {
      store.setEditingGroup(groupId);
      store.setSelection(getSelectionUnit(store.elements, shape, groupId));
      return;
    }

    if (hit?.type === "text") {
      startEditingText(hit, false);
    } else if (hit?.type === "compartments") {
      startEditingSection(hit, getSectionAt(hit, rotatePoint(world, getCenter(hit), -hit.rotation)));
    } else if (hit?.type === "table") {
      startEditingCell(hit, getCellAt(hit, toLocal(hit, world)));
    } else if (shape && isLabeledElement(shape)) {
      startEditingLabel(shape);
    } else if (!hit) {
      const text = createStyledText(boardStore, world);
      startEditingText({ ...text, y: world.y - lineHeight(text.textStyle) / 2 }, true);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLCanvasElement>) {
    if (!e.dataTransfer.types.includes(LIBRARY_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(e: React.DragEvent<HTMLCanvasElement>) {
    const item = findLibraryItem(e.dataTransfer.getData(LIBRARY_DRAG_TYPE));
    if (!item) return;
    e.preventDefault();
    if (editing) (document.activeElement as HTMLElement | null)?.blur();
    insertLibraryItem(boardStore, item, getScreenPoint(e));
  }

  let styleBarPlacement: StyleBarPlacement = { kind: "top" };
  const selectionBounds = getSelectionBounds(selected);
  if (selectionBounds) {
    const topLeft = worldToScreen(selectionBounds, viewport);
    const handleReach = ROTATION_HANDLE_DISTANCE + ROTATION_HANDLE_RADIUS;
    const width = selectionBounds.width * viewport.zoom;
    const height = selectionBounds.height * viewport.zoom;
    styleBarPlacement = {
      kind: "selection",
      rect: { x: topLeft.x, y: topLeft.y - handleReach, width, height: height + handleReach },
    };
  }

  let cursor: string;
  if (isPanning) cursor = "grabbing";
  else if (tool === "hand" || spacePressed) cursor = "grab";
  else if (tool === "selection") cursor = hoverCursor;
  else if (tool === "text") cursor = "text";
  else cursor = "crosshair";

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={() => {
          hoverPointRef.current = null;
        }}
        onDoubleClick={handleDoubleClick}
        onAuxClick={(e) => e.preventDefault()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
      {!editing && !isInteracting && <StyleBar placement={styleBarPlacement} viewportWidth={size.width} />}
      {editing && (
        <TextEditor
          key={editorKey(editing)}
          initialText={editorInitialText(editing)}
          textStyle={editorTextStyle(boardStore, editing)}
          color={adaptColor(resolveTextColor(editorTextStyle(boardStore, editing), editing.element), theme.scheme)}
          layout={editorLayout(editing, editingText)}
          viewport={viewport}
          onChange={setEditingText}
          onSubmit={finishEditing}
          onTab={editing.kind === "cell" ? navigateCell : undefined}
        />
      )}
    </>
  );
}
