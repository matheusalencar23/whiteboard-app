import { ARROWHEADS, type BoardElement, type ElementType } from "./elements/types";
import { updateBoundArrows } from "./elements/bindings";
import { MAX_ZOOM, MIN_ZOOM, type Viewport } from "./viewport";
import { GRID_STYLES, type GridStyle } from "./render/grid";

const STORAGE_KEY = "whiteboard:board";

export interface SavedBoard {
  elements: BoardElement[];
  viewport: Viewport;
  showGrid: boolean;
  gridStyle: GridStyle;
}

export const DEFAULT_PREFERENCES: Pick<SavedBoard, "showGrid" | "gridStyle"> = {
  showGrid: true,
  gridStyle: "dots",
};

const ELEMENT_TYPES: Record<ElementType, true> = {
  rectangle: true,
  ellipse: true,
  diamond: true,
  arrow: true,
  freedraw: true,
  text: true,
};

export function saveBoard(board: SavedBoard): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch (error) {
    console.warn("Não foi possível salvar o board.", error);
  }
}

export function loadBoard(): SavedBoard | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  const board = parseBoard(raw);
  if (board) return board;
  console.warn("Board salvo inválido, abrindo um board vazio.");
  return null;
}

function parseBoard(raw: string): SavedBoard | null {
  try {
    return readBoard(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readBoard(data: unknown): SavedBoard | null {
  if (!isObject(data)) return null;
  const { elements, viewport } = data;
  if (!Array.isArray(elements) || !elements.every(isValidElement)) return null;
  if (!isValidViewport(viewport)) return null;
  const showGrid =
    typeof data.showGrid === "boolean" ? data.showGrid : DEFAULT_PREFERENCES.showGrid;

  const gridStyle = GRID_STYLES.find((style) => style === data.gridStyle) ?? DEFAULT_PREFERENCES.gridStyle;

  return { elements: updateBoundArrows(elements, []), viewport, showGrid, gridStyle };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidViewport(value: unknown): value is Viewport {
  return (
    isObject(value) &&
    isNumber(value.offsetX) &&
    isNumber(value.offsetY) &&
    isNumber(value.zoom) &&
    value.zoom >= MIN_ZOOM &&
    value.zoom <= MAX_ZOOM
  );
}

function isValidPoints(value: unknown): boolean {
  return Array.isArray(value) && value.every((p) => isObject(p) && isNumber(p.x) && isNumber(p.y));
}

function isValidSegments(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    Array.isArray(value) &&
    value.every((s) => isObject(s) && isValidPoints([s.start, s.end]))
  );
}

function isValidBinding(value: unknown): boolean {
  if (value === null) return true;
  if (!isObject(value) || typeof value.elementId !== "string") return false;
  if (typeof value.fixed !== "boolean") return false;
  const { anchor } = value;
  return isObject(anchor) && isNumber(anchor.x) && isNumber(anchor.y);
}

function isValidElement(value: unknown): value is BoardElement {
  if (!isObject(value)) return false;
  if (typeof value.type !== "string" || !Object.hasOwn(ELEMENT_TYPES, value.type)) return false;

  const { style } = value;
  const baseOk =
    typeof value.id === "string" &&
    isNumber(value.x) &&
    isNumber(value.y) &&
    isNumber(value.width) &&
    isNumber(value.height) &&
    isNumber(value.rotation) &&
    isNumber(value.seed) &&
    isObject(style) &&
    typeof style.strokeColor === "string" &&
    typeof style.fillColor === "string" &&
    isNumber(style.strokeWidth) &&
    isNumber(style.roughness);
  if (!baseOk) return false;

  switch (value.type as ElementType) {
    case "arrow":
      return (
        isValidPoints(value.points) &&
        (value.points as unknown[]).length >= 2 &&
        (value.routing === "straight" || value.routing === "elbow" || value.routing === "curved") &&
        isArrowhead(value.startArrowhead) &&
        isArrowhead(value.endArrowhead) &&
        isValidSegments(value.fixedSegments) &&
        isValidBinding(value.startBinding) &&
        isValidBinding(value.endBinding) &&
        isValidLabel(value.label)
      );
    case "freedraw":
      return isValidPoints(value.points);
    case "text":
      return typeof value.text === "string" && isNumber(value.fontSize);
    case "rectangle":
    case "ellipse":
    case "diamond":
      return isValidLabel(value.label);
  }
}

function isArrowhead(value: unknown): boolean {
  return (ARROWHEADS as readonly unknown[]).includes(value);
}

function isValidLabel(value: unknown): boolean {
  if (value === undefined) return true;
  return isObject(value) && typeof value.text === "string" && isNumber(value.fontSize);
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: A | undefined;

  const run = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    const args = pending;
    pending = undefined;
    fn(...args);
  };

  const debounced = (...args: A) => {
    pending = args;
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  };
  debounced.flush = run;
  debounced.cancel = () => {
    clearTimeout(timer);
    pending = undefined;
  };
  return debounced;
}
