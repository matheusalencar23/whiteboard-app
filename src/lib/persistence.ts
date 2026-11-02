import type { BoardElement, ElementType } from "./elements/types";
import { MAX_ZOOM, MIN_ZOOM, type Viewport } from "./viewport";

/**
 * Salvamento do board no `localStorage`. Só `elements` e `viewport` são
 * salvos; histórico, seleção e ferramenta começam limpos a cada abertura.
 */

const STORAGE_KEY = "whiteboard:board";

/** Sobe quando o formato muda. Dados antigos passam por `migrate`. */
export const CURRENT_VERSION = 1;

export interface SavedBoard {
  elements: BoardElement[];
  viewport: Viewport;
}

interface StoredBoard extends SavedBoard {
  version: number;
}

/** Os tipos conhecidos. O `Record` faz o TypeScript reclamar se faltar um. */
const ELEMENT_TYPES: Record<ElementType, true> = {
  rectangle: true,
  ellipse: true,
  diamond: true,
  arrow: true,
  freedraw: true,
  text: true,
};

export function saveBoard(board: SavedBoard): void {
  const stored: StoredBoard = { version: CURRENT_VERSION, ...board };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    // Cota excedida ou storage bloqueado: o board continua funcionando sem salvar.
    console.warn("Não foi possível salvar o board.", error);
  }
}

/** Lê o board salvo. Devolve `null` se não houver nada ou se os dados forem inválidos. */
export function loadBoard(): SavedBoard | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const board = migrate(JSON.parse(raw));
    if (board) return board;
  } catch {
    // JSON corrompido: cai no aviso abaixo.
  }
  console.warn("Board salvo inválido, abrindo um board vazio.");
  return null;
}

/**
 * Converte dados de qualquer versão conhecida para o formato atual e valida.
 * Devolve `null` para versões desconhecidas ou dados malformados.
 */
function migrate(data: unknown): SavedBoard | null {
  if (!isObject(data) || typeof data.version !== "number") return null;
  if (data.version !== CURRENT_VERSION) return null;
  // Migrações futuras entram aqui, uma versão por vez (ex.: 1 -> 2).

  const { elements, viewport } = data;
  if (!Array.isArray(elements) || !elements.every(isValidElement)) return null;
  if (!isValidViewport(viewport)) return null;
  return { elements, viewport };
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
    case "freedraw":
      return isValidPoints(value.points);
    case "text":
      return typeof value.text === "string" && isNumber(value.fontSize);
    default:
      return true;
  }
}

/**
 * Agrupa chamadas seguidas: `fn` roda `delay` ms depois da última chamada.
 * `flush` executa na hora o que estiver pendente (ex.: ao fechar a página).
 */
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
