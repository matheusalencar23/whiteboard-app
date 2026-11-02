import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Point } from "../types";
import { getBounds, getCenter, type Bounds } from "../geometry/bounds";
import { rotatePoint } from "../geometry/distance";
import { baseFields, type ShapeUtil } from "./shapeUtil";
import type { BoardElement, BoxElementType, ElementOfType, ElementType } from "./types";
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

export function renderElement(
  element: BoardElement,
  rc: RoughCanvas,
  ctx: CanvasRenderingContext2D,
) {
  const util = getShapeUtil(element);
  if (element.rotation === 0) {
    util.draw(element, rc, ctx);
    return;
  }
  const center = getCenter(element);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(element.rotation);
  ctx.translate(-center.x, -center.y);
  util.draw(element, rc, ctx);
  ctx.restore();
}

export function hitTestElement(element: BoardElement, point: Point, tolerance: number) {
  // Leva o ponto para o espaço do elemento sem rotação.
  const local = rotatePoint(point, getCenter(element), -element.rotation);
  return getShapeUtil(element).hitTest(element, local, tolerance);
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
