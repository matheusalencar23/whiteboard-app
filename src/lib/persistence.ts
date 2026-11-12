import {
  ARROWHEADS,
  FILL_STYLES,
  FONT_FAMILIES,
  SHAPE_KINDS,
  STROKE_STYLES,
  TEXT_ALIGNS,
  VERTICAL_ALIGNS,
  type BoardElement,
  type ElementType,
} from "./elements/types";
import { updateBoundArrows } from "./elements/bindings";
import { nanoid } from "nanoid";
import { INITIAL_VIEWPORT, MAX_ZOOM, MIN_ZOOM, type Viewport } from "./viewport";
import { GRID_STYLES, type GridStyle } from "./render/grid";

const INDEX_KEY = "whiteboard:boards";
const BOARD_KEY_PREFIX = "whiteboard:board:";
const PREFERENCES_KEY = "whiteboard:preferences";

export interface BoardContent {
  name: string;
  elements: BoardElement[];
  viewport: Viewport;
}

export interface BoardSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface Preferences {
  showGrid: boolean;
  gridStyle: GridStyle;
  libraryOpen: boolean;
}

const FILE_TYPE = "whiteboard";

export const DEFAULT_BOARD_NAME = "Board sem título";
export const MAX_BOARD_NAME_LENGTH = 80;

export function normalizeBoardName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/\s+/g, " ").trim().slice(0, MAX_BOARD_NAME_LENGTH);
  return name === "" ? null : name;
}

export const DEFAULT_PREFERENCES: Preferences = {
  showGrid: true,
  gridStyle: "dots",
  libraryOpen: false,
};

const ELEMENT_TYPES: Record<ElementType, true> = {
  rectangle: true,
  ellipse: true,
  diamond: true,
  shape: true,
  table: true,
  arrow: true,
  freedraw: true,
  text: true,
};

function readItem(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : parseJson(raw);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Não foi possível salvar "${key}".`, error);
    return false;
  }
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Não foi possível apagar "${key}".`, error);
  }
}

function boardKey(id: string): string {
  return BOARD_KEY_PREFIX + id;
}

function isValidSummary(value: unknown): value is BoardSummary {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isNumber(value.createdAt) &&
    isNumber(value.updatedAt)
  );
}

function readIndex(): BoardSummary[] {
  const data = readItem(INDEX_KEY);
  return Array.isArray(data) ? data.filter(isValidSummary) : [];
}

export function listBoards(): BoardSummary[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadStoredBoard(id: string): BoardContent | null {
  const data = readItem(boardKey(id));
  if (!isObject(data)) return null;
  const content = readBoardContent(data);
  if (!content) {
    console.warn(`Board "${id}" salvo inválido.`);
    return null;
  }
  return { ...content, name: normalizeBoardName(data.name) ?? DEFAULT_BOARD_NAME };
}

export function saveStoredBoard(id: string, { name, elements, viewport }: BoardContent): boolean {
  if (!writeItem(boardKey(id), { name, elements, viewport })) return false;
  const now = Date.now();
  const index = readIndex();
  const existing = index.find((summary) => summary.id === id);
  const summary = { id, name, createdAt: existing?.createdAt ?? now, updatedAt: now };
  return writeItem(INDEX_KEY, existing ? index.map((s) => (s.id === id ? summary : s)) : [...index, summary]);
}

export function createStoredBoard(content: Partial<BoardContent> = {}): string | null {
  const id = nanoid(10);
  const board: BoardContent = {
    name: content.name ?? DEFAULT_BOARD_NAME,
    elements: content.elements ?? [],
    viewport: content.viewport ?? INITIAL_VIEWPORT,
  };
  return saveStoredBoard(id, board) ? id : null;
}

export function duplicateStoredBoard(id: string): string | null {
  const board = loadStoredBoard(id);
  if (!board) return null;
  return createStoredBoard({ ...board, name: `${board.name} (cópia)`.slice(0, MAX_BOARD_NAME_LENGTH) });
}

export function renameStoredBoard(id: string, name: string): boolean {
  const board = loadStoredBoard(id);
  if (!board) return false;
  return saveStoredBoard(id, { ...board, name: normalizeBoardName(name) ?? DEFAULT_BOARD_NAME });
}

export function deleteStoredBoard(id: string): void {
  removeItem(boardKey(id));
  writeItem(
    INDEX_KEY,
    readIndex().filter((summary) => summary.id !== id),
  );
}

export function loadPreferences(): Preferences {
  const data = readItem(PREFERENCES_KEY);
  if (!isObject(data)) return DEFAULT_PREFERENCES;
  return {
    showGrid: typeof data.showGrid === "boolean" ? data.showGrid : DEFAULT_PREFERENCES.showGrid,
    gridStyle: GRID_STYLES.find((style) => style === data.gridStyle) ?? DEFAULT_PREFERENCES.gridStyle,
    libraryOpen: typeof data.libraryOpen === "boolean" ? data.libraryOpen : DEFAULT_PREFERENCES.libraryOpen,
  };
}

export function savePreferences(preferences: Preferences): void {
  writeItem(PREFERENCES_KEY, preferences);
}

export function serializeBoardFile({ name, elements, viewport }: BoardContent): string {
  return JSON.stringify({ type: FILE_TYPE, name, elements, viewport }, null, 2);
}

export function parseBoardFile(raw: string, fallbackName: string): BoardContent | null {
  const data = parseJson(raw);
  if (!isObject(data) || data.type !== FILE_TYPE) return null;
  const content = readBoardContent(data);
  if (!content) return null;
  return { ...content, name: normalizeBoardName(data.name) ?? normalizeBoardName(fallbackName) ?? DEFAULT_BOARD_NAME };
}

export function serializeClipboard(elements: BoardElement[]): string {
  return JSON.stringify({ type: FILE_TYPE, elements });
}

export function parseClipboard(raw: string): BoardElement[] | null {
  if (!raw.trimStart().startsWith("{")) return null;
  const data = parseJson(raw);
  if (!isObject(data) || data.type !== FILE_TYPE) return null;
  const { elements } = data;
  if (!Array.isArray(elements) || elements.length === 0 || !elements.every(isValidElement)) return null;
  return elements;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readBoardContent(data: Record<string, unknown>): Omit<BoardContent, "name"> | null {
  const { elements, viewport } = data;
  if (!Array.isArray(elements) || !elements.every(isValidElement)) return null;
  if (!isValidViewport(viewport)) return null;
  if (new Set(elements.map((el) => el.id)).size !== elements.length) return null;
  return { elements: updateBoundArrows(elements, []), viewport };
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
    isValidGroupIds(value.groupIds) &&
    isObject(style) &&
    typeof style.strokeColor === "string" &&
    isNumber(style.strokeWidth) &&
    isOneOf(STROKE_STYLES, style.strokeStyle) &&
    isNumber(style.strokeRoughness) &&
    isNumber(style.strokeOpacity) &&
    typeof style.fillColor === "string" &&
    isOneOf(FILL_STYLES, style.fillStyle) &&
    isNumber(style.fillRoughness) &&
    isNumber(style.fillOpacity);
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
        isValidLabel(value.label) &&
        isValidLabelPosition(value.labelPosition)
      );
    case "freedraw":
      return isValidPoints(value.points);
    case "text":
      return typeof value.text === "string" && isValidTextStyle(value.textStyle);
    case "rectangle":
    case "ellipse":
    case "diamond":
      return isValidLabel(value.label);
    case "table":
      return (
        Array.isArray(value.sections) &&
        value.sections.length > 0 &&
        value.sections.every((section) => isObject(section) && typeof section.text === "string") &&
        isValidTextStyle(value.textStyle)
      );
    case "shape":
      return isOneOf(SHAPE_KINDS, value.kind) && isValidLabel(value.label);
  }
}

function isValidGroupIds(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every((id) => typeof id === "string"));
}

function isValidLabelPosition(value: unknown): boolean {
  return value === undefined || (isNumber(value) && value >= 0 && value <= 1);
}

function isOneOf(options: readonly string[], value: unknown): boolean {
  return (options as readonly unknown[]).includes(value);
}

function isArrowhead(value: unknown): boolean {
  return isOneOf(ARROWHEADS, value);
}

function isValidLabel(value: unknown): boolean {
  if (value === undefined) return true;
  return isObject(value) && typeof value.text === "string" && isValidTextStyle(value.textStyle);
}

function isValidTextStyle(value: unknown): boolean {
  return (
    isObject(value) &&
    isOneOf(FONT_FAMILIES, value.fontFamily) &&
    isNumber(value.fontSize) &&
    (value.color === null || typeof value.color === "string") &&
    typeof value.bold === "boolean" &&
    typeof value.italic === "boolean" &&
    isOneOf(TEXT_ALIGNS, value.align) &&
    isOneOf(VERTICAL_ALIGNS, value.verticalAlign)
  );
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
