import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Point } from "../types";
import { containsPoint, expandBounds, getBounds, getCenter, type Bounds } from "../geometry/bounds";
import { distance, rotatePoint } from "../geometry/distance";
import { LINE_HEIGHT, fontString, layoutText } from "../text";
import { baseFields, type ShapeUtil } from "./shapeUtil";
import {
  isBoxElement,
  type BoardElement,
  type BoxElementType,
  type ElementOfType,
  type ElementType,
} from "./types";
import { rectangleUtil } from "./shapes/rectangle";
import { ellipseUtil } from "./shapes/ellipse";
import { diamondUtil } from "./shapes/diamond";
import { arrowUtil } from "./shapes/arrow";
import { freedrawUtil } from "./shapes/freedraw";
import { textUtil } from "./shapes/text";

/** O tipo mapeado obriga a registrar todo tipo da união `BoardElement`. */
const shapeUtils: { [K in ElementType]: ShapeUtil<ElementOfType<K>> } = {
  rectangle: rectangleUtil,
  ellipse: ellipseUtil,
  diamond: diamondUtil,
  arrow: arrowUtil,
  freedraw: freedrawUtil,
  text: textUtil,
};

export function getShapeUtil<T extends BoardElement>(element: T): ShapeUtil<T> {
  return shapeUtils[element.type] as unknown as ShapeUtil<T>;
}

/** Retângulo, elipse ou losango a partir de dois cantos opostos. */
export function createBoxElement(type: BoxElementType, start: Point, end: Point): BoardElement {
  return { ...baseFields(getBounds([start, end])), type };
}

/** Caixa ocupada pelo desenho (ignora a rotação por enquanto). */
export function getElementBounds(element: BoardElement): Bounds {
  const custom = getShapeUtil(element).getBounds?.(element);
  if (custom) return custom;
  const { x, y, width, height } = element;
  return { x, y, width, height };
}

/** Setas podem se ligar a este elemento? */
export function isBindable(element: BoardElement): boolean {
  return getShapeUtil(element).getBorderOffset !== undefined;
}

/** Pontos de conexão em coordenadas relativas (0 a 1). Vazio se a forma não tiver. */
export function getConnectionAnchors(element: BoardElement): Point[] {
  return getShapeUtil(element).getConnectionPoints?.(element) ?? [];
}

/**
 * Ponto da borda na direção `direction` (de mundo) a partir do centro.
 * Devolve o centro para elementos sem borda definida.
 */
export function getBorderPoint(element: BoardElement, direction: Point): Point {
  const center = getCenter(element);
  const local = rotatePoint(direction, { x: 0, y: 0 }, -element.rotation);
  const offset = getShapeUtil(element).getBorderOffset?.(element, local) ?? { x: 0, y: 0 };
  const rotated = rotatePoint(offset, { x: 0, y: 0 }, element.rotation);
  return { x: center.x + rotated.x, y: center.y + rotated.y };
}

/** Folga entre o rótulo e a borda da área dele, em unidades de mundo. */
const LABEL_PADDING = 8;

/** Rótulo de uma forma já quebrado em linhas e posicionado (sem rotação). */
export interface LabelLayout {
  lines: string[];
  fontSize: number;
  /** Área em que o texto quebra linha. */
  area: Bounds;
  /** Caixa ocupada pelas linhas, centralizada na área. */
  box: Bounds;
}

/** Área de quebra do rótulo, já sem a folga. `null` se a forma não aceita rótulo. */
export function getLabelArea(element: BoardElement): Bounds | null {
  const area = getShapeUtil(element).getLabelArea?.(element);
  if (!area) return null;
  const inner = expandBounds(area, -LABEL_PADDING);
  // Forma pequena demais: o texto quebra numa largura mínima e transborda.
  const width = Math.max(inner.width, 1);
  const height = Math.max(inner.height, 0);
  const center = getCenter(area);
  return { x: center.x - width / 2, y: center.y - height / 2, width, height };
}

export function getLabelLayout(element: BoardElement): LabelLayout | null {
  if (!isBoxElement(element) || !element.label || element.label.text === "") return null;
  const area = getLabelArea(element);
  if (!area) return null;

  const { text, fontSize } = element.label;
  const { lines, width, height } = layoutText(text, fontSize, area.width);
  const center = getCenter(area);
  const box = { x: center.x - width / 2, y: center.y - height / 2, width, height };
  return { lines, fontSize, area, box };
}

/** Desenha o rótulo centralizado, um ponto comum a todas as formas. */
function drawLabel(element: BoardElement, ctx: CanvasRenderingContext2D) {
  const layout = getLabelLayout(element);
  if (!layout) return;
  const { lines, fontSize, box } = layout;
  const centerX = box.x + box.width / 2;
  const lineHeight = fontSize * LINE_HEIGHT;

  ctx.save();
  ctx.font = fontString(fontSize);
  ctx.fillStyle = element.style.strokeColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => ctx.fillText(line, centerX, box.y + lineHeight * (i + 0.5)));
  ctx.restore();
}

export function renderElement(
  element: BoardElement,
  rc: RoughCanvas,
  ctx: CanvasRenderingContext2D,
) {
  const util = getShapeUtil(element);
  const rotated = element.rotation !== 0;
  if (rotated) {
    const center = getCenter(element);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(element.rotation);
    ctx.translate(-center.x, -center.y);
  }
  util.draw(element, rc, ctx);
  drawLabel(element, ctx);
  if (rotated) ctx.restore();
}

export function hitTestElement(element: BoardElement, point: Point, tolerance: number) {
  // Leva o ponto para o espaço do elemento sem rotação.
  const local = rotatePoint(point, getCenter(element), -element.rotation);
  if (getShapeUtil(element).hitTest(element, local, tolerance)) return true;
  // O texto do rótulo também é clicável, mesmo numa forma sem preenchimento.
  const label = getLabelLayout(element);
  return label !== null && containsPoint(expandBounds(label.box, tolerance), local);
}

/**
 * O ponto está no interior da forma (com folga `tolerance`), mesmo que ela
 * não tenha preenchimento? Só para formas com borda definida.
 */
export function isInsideShape(element: BoardElement, point: Point, tolerance: number): boolean {
  if (!getShapeUtil(element).getBorderOffset) return false;
  const center = getCenter(element);
  const dir = { x: point.x - center.x, y: point.y - center.y };
  const reach = distance(center, getBorderPoint(element, dir));
  return distance(center, point) <= reach + tolerance;
}

/** Forma mais acima cujo interior contém o ponto e que aceita rótulo. */
export function getLabelTargetAt(elements: BoardElement[], point: Point, tolerance: number) {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (getShapeUtil(el).getLabelArea && isInsideShape(el, point, tolerance)) return el;
  }
  return null;
}

/** Elemento mais acima (o último desenhado) sob o ponto. */
export function getElementAtPoint(
  elements: BoardElement[],
  point: Point,
  tolerance: number,
): BoardElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitTestElement(elements[i], point, tolerance)) return elements[i];
  }
  return null;
}

export function translateElement<T extends BoardElement>(element: T, dx: number, dy: number): T {
  return { ...element, x: element.x + dx, y: element.y + dy };
}

export function resizeElement<T extends BoardElement>(element: T, bounds: Bounds): T {
  return getShapeUtil(element).resize(element, bounds);
}
