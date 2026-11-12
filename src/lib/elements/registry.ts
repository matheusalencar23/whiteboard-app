import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Point } from "../types";
import {
  containsPoint,
  expandBounds,
  getBounds,
  getCenter,
  getCorners,
  unionBounds,
  type Bounds,
} from "../geometry/bounds";
import { distance, rotatePoint } from "../geometry/distance";
import { alignedX, fontString, layoutText, lineHeight } from "../text";
import { baseFields, type ShapeUtil } from "./shapeUtil";
import {
  isLabeledElement,
  type BoardElement,
  type BoxElement,
  type BoxElementType,
  type ElementOfType,
  type ElementType,
  type LabeledElement,
  type TextStyle,
} from "./types";
import { rectangleUtil } from "./shapes/rectangle";
import { ellipseUtil } from "./shapes/ellipse";
import { diamondUtil } from "./shapes/diamond";
import { shapeUtil } from "./shapes/shape";
import { drawTableText, tableUtil } from "./shapes/table";
import { arrowUtil } from "./shapes/arrow";
import { freedrawUtil } from "./shapes/freedraw";
import { resolveTextColor, textUtil } from "./shapes/text";

const shapeUtils: { [K in ElementType]: ShapeUtil<ElementOfType<K>> } = {
  rectangle: rectangleUtil,
  ellipse: ellipseUtil,
  diamond: diamondUtil,
  shape: shapeUtil,
  table: tableUtil,
  arrow: arrowUtil,
  freedraw: freedrawUtil,
  text: textUtil,
};

export function getShapeUtil<T extends BoardElement>(element: T): ShapeUtil<T> {
  return shapeUtils[element.type] as unknown as ShapeUtil<T>;
}

export function createBoxElement(type: BoxElementType, start: Point, end: Point): BoxElement {
  return { ...baseFields(getBounds([start, end])), type };
}

export function getElementBox(element: BoardElement): Bounds {
  const { x, y, width, height } = element;
  return { x, y, width, height };
}

export function getElementBounds(element: BoardElement): Bounds {
  const shapeBox = getShapeUtil(element).getBounds?.(element) ?? getElementBox(element);
  const label = element.type === "arrow" ? getLabelLayout(element) : null;
  const box = label ? unionBounds([shapeBox, label.box]) : shapeBox;
  if (element.rotation === 0) return box;
  const center = getCenter(element);
  return getBounds(getCorners(box).map((p) => rotatePoint(p, center, element.rotation)));
}

export function isBindable(element: BoardElement): boolean {
  return getShapeUtil(element).getBorderOffset !== undefined;
}

export function getConnectionAnchors(element: BoardElement): Point[] {
  return getShapeUtil(element).getConnectionPoints?.(element) ?? [];
}

export function getBorderPoint(element: BoardElement, direction: Point): Point {
  const center = getCenter(element);
  const local = rotatePoint(direction, { x: 0, y: 0 }, -element.rotation);
  const offset = getShapeUtil(element).getBorderOffset?.(element, local) ?? { x: 0, y: 0 };
  const rotated = rotatePoint(offset, { x: 0, y: 0 }, element.rotation);
  return { x: center.x + rotated.x, y: center.y + rotated.y };
}

const LABEL_PADDING = 8;
const ARROW_LABEL_GAP = 4;
const ARROW_CLIP_MARGIN = 50;

export interface LabelLayout {
  lines: string[];
  textStyle: TextStyle;
  area: Bounds;
  box: Bounds;
}

export function getLabelTextStyle(element: LabeledElement, textStyle: TextStyle): TextStyle {
  if (element.type !== "arrow") return textStyle;
  return { ...textStyle, align: "center", verticalAlign: "middle" };
}

function alignInArea(area: Bounds, size: { width: number; height: number }, style: TextStyle): Bounds {
  const x =
    style.align === "left"
      ? area.x
      : style.align === "right"
        ? area.x + area.width - size.width
        : area.x + (area.width - size.width) / 2;
  const y =
    style.verticalAlign === "top"
      ? area.y
      : style.verticalAlign === "bottom"
        ? area.y + area.height - size.height
        : area.y + (area.height - size.height) / 2;
  return { x, y, ...size };
}

export function getLabelArea(element: BoardElement): Bounds | null {
  const area = getShapeUtil(element).getLabelArea?.(element);
  if (!area) return null;
  const inner = expandBounds(area, -LABEL_PADDING);
  const width = Math.max(inner.width, 1);
  const height = Math.max(inner.height, 0);
  const center = getCenter(area);
  return { x: center.x - width / 2, y: center.y - height / 2, width, height };
}

export function getLabelLayout(element: BoardElement, keepEmpty = false): LabelLayout | null {
  if (!isLabeledElement(element) || !element.label) return null;
  if (element.label.text === "" && !keepEmpty) return null;
  const area = getLabelArea(element);
  if (!area) return null;

  const textStyle = getLabelTextStyle(element, element.label.textStyle);
  const { lines, width, height } = layoutText(element.label.text, textStyle, area.width);
  const box = alignInArea(area, { width, height }, textStyle);
  return { lines, textStyle, area, box };
}

function drawLabel(element: BoardElement, ctx: CanvasRenderingContext2D) {
  const layout = getLabelLayout(element);
  if (!layout) return;
  const { lines, textStyle, box } = layout;
  const x = alignedX(textStyle.align, box.x, box.width);
  const step = lineHeight(textStyle);

  ctx.save();
  ctx.font = fontString(textStyle);
  ctx.fillStyle = resolveTextColor(textStyle, element);
  ctx.textAlign = textStyle.align;
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => ctx.fillText(line, x, box.y + step * (i + 0.5)));
  ctx.restore();
}

function clipOutsideArrowLabel(
  element: BoardElement,
  ctx: CanvasRenderingContext2D,
  isEditing: boolean,
): boolean {
  if (element.type !== "arrow") return false;
  const label = getLabelLayout(element, isEditing);
  if (!label) return false;
  const outer = expandBounds(getElementBounds(element), ARROW_CLIP_MARGIN + element.style.strokeWidth);
  const gap = expandBounds(label.box, ARROW_LABEL_GAP);
  ctx.save();
  ctx.beginPath();
  ctx.rect(outer.x, outer.y, outer.width, outer.height);
  ctx.rect(gap.x, gap.y, gap.width, gap.height);
  ctx.clip("evenodd");
  return true;
}

export type HiddenText = "label" | number | null;

export function renderElement(
  element: BoardElement,
  rc: RoughCanvas,
  ctx: CanvasRenderingContext2D,
  hiddenText: HiddenText = null,
) {
  const showLabel = hiddenText !== "label";
  const util = getShapeUtil(element);
  ctx.save();
  ctx.globalAlpha = element.style.strokeOpacity / 100;
  ctx.lineCap = "round";
  if (element.rotation !== 0) {
    const center = getCenter(element);
    ctx.translate(center.x, center.y);
    ctx.rotate(element.rotation);
    ctx.translate(-center.x, -center.y);
  }
  const clipped = clipOutsideArrowLabel(element, ctx, !showLabel);
  util.draw(element, rc, ctx);
  if (clipped) ctx.restore();
  if (showLabel) drawLabel(element, ctx);
  if (element.type === "table") drawTableText(element, ctx, typeof hiddenText === "number" ? hiddenText : null);
  ctx.restore();
}

export function hitTestElement(element: BoardElement, point: Point, tolerance: number) {
  const local = rotatePoint(point, getCenter(element), -element.rotation);
  if (getShapeUtil(element).hitTest(element, local, tolerance)) return true;
  const label = getLabelLayout(element);
  return label !== null && containsPoint(expandBounds(label.box, tolerance), local);
}

export function isInsideShape(element: BoardElement, point: Point, tolerance: number): boolean {
  if (!getShapeUtil(element).getBorderOffset) return false;
  const center = getCenter(element);
  const dir = { x: point.x - center.x, y: point.y - center.y };
  const reach = distance(center, getBorderPoint(element, dir));
  return distance(center, point) <= reach + tolerance;
}

export function getLabelTargetAt(elements: BoardElement[], point: Point, tolerance: number) {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (getShapeUtil(el).getLabelArea && isInsideShape(el, point, tolerance)) return el;
  }
  return null;
}

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
