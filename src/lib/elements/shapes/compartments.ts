import type { Point } from "../../types";
import { containsPoint, expandBounds, getCenter, type Bounds } from "../../geometry/bounds";
import { rotatePoint } from "../../geometry/distance";
import { alignedX, fontString, layoutText, lineHeight } from "../../text";
import {
  baseFields,
  drawFillAndStroke,
  scaleToBorder,
  SIDE_MIDPOINTS,
  strokeOptions,
  type ShapeUtil,
} from "../shapeUtil";
import type { CompartmentsElement, TextStyle } from "../types";
import { resolveTextColor } from "./text";

const PADDING_X = 10;
const PADDING_Y = 6;

export function getSectionTextStyle(el: CompartmentsElement, index: number): TextStyle {
  if (index === 0) return { ...el.textStyle, bold: true, align: "center", verticalAlign: "middle" };
  return { ...el.textStyle, verticalAlign: "top" };
}

function innerWidth(el: CompartmentsElement): number {
  return Math.max(el.width - PADDING_X * 2, 1);
}

function fitSectionHeight(el: CompartmentsElement, index: number): number {
  const style = getSectionTextStyle(el, index);
  const { height } = layoutText(el.sections[index].text, style, innerWidth(el));
  return Math.max(height, lineHeight(style)) + PADDING_Y * 2;
}

function getSectionHeights(el: CompartmentsElement): number[] {
  const heights = el.sections.map((_, i) => fitSectionHeight(el, i));
  const others = heights.slice(0, -1).reduce((sum, h) => sum + h, 0);
  heights[heights.length - 1] = Math.max(heights[heights.length - 1], el.height - others);
  return heights;
}

export function getSectionRects(el: CompartmentsElement): Bounds[] {
  let y = el.y;
  return getSectionHeights(el).map((height) => {
    const rect = { x: el.x, y, width: el.width, height };
    y += height;
    return rect;
  });
}

export function getSectionTextArea(el: CompartmentsElement, index: number): Bounds {
  const rect = getSectionRects(el)[index];
  return {
    x: rect.x + PADDING_X,
    y: rect.y + PADDING_Y,
    width: innerWidth(el),
    height: Math.max(rect.height - PADDING_Y * 2, 0),
  };
}

export function getSectionAt(el: CompartmentsElement, localPoint: Point): number {
  const index = getSectionRects(el).findIndex((rect) => localPoint.y < rect.y + rect.height);
  return index === -1 ? el.sections.length - 1 : index;
}

function withHeight(el: CompartmentsElement, height: number): CompartmentsElement {
  if (height === el.height) return el;
  if (el.rotation === 0) return { ...el, height };
  const corner = rotatePoint({ x: el.x, y: el.y }, getCenter(el), el.rotation);
  const half = rotatePoint({ x: el.width / 2, y: height / 2 }, { x: 0, y: 0 }, el.rotation);
  const center = { x: corner.x + half.x, y: corner.y + half.y };
  return { ...el, height, x: center.x - el.width / 2, y: center.y - height / 2 };
}

function minCompartmentsHeight(el: CompartmentsElement): number {
  return el.sections.reduce((sum, _, i) => sum + fitSectionHeight(el, i), 0);
}

export function fitCompartments(el: CompartmentsElement): CompartmentsElement {
  return withHeight(el, Math.max(el.height, minCompartmentsHeight(el)));
}

export function createCompartments(bounds: Bounds, texts: string[], textStyle: TextStyle): CompartmentsElement {
  const sections = texts.map((text) => ({ text }));
  return fitCompartments({ ...baseFields(bounds), type: "compartments", sections, textStyle });
}

export function setSectionText(el: CompartmentsElement, index: number, text: string): CompartmentsElement {
  if (el.sections[index]?.text === text) return el;
  const sections = el.sections.map((section, i) => (i === index ? { ...section, text } : section));
  return fitCompartments({ ...el, sections });
}

export function drawCompartmentsText(el: CompartmentsElement, ctx: CanvasRenderingContext2D, hiddenSection: number | null) {
  const rects = getSectionRects(el);
  el.sections.forEach((section, index) => {
    if (index === hiddenSection || section.text === "") return;
    const style = getSectionTextStyle(el, index);
    const rect = rects[index];
    const area = { x: rect.x + PADDING_X, width: innerWidth(el) };
    const { lines, height } = layoutText(section.text, style, area.width);
    const step = lineHeight(style);
    const top = index === 0 ? rect.y + (rect.height - height) / 2 : rect.y + PADDING_Y;
    const x = alignedX(style.align, area.x, area.width);
    ctx.save();
    ctx.font = fontString(style);
    ctx.fillStyle = resolveTextColor(style, el);
    ctx.textAlign = style.align;
    ctx.textBaseline = "middle";
    lines.forEach((line, i) => ctx.fillText(line, x, top + step * (i + 0.5)));
    ctx.restore();
  });
}

export const compartmentsUtil: ShapeUtil<CompartmentsElement> = {
  draw(el, rc, ctx) {
    drawFillAndStroke(ctx, el.style, el.seed, (options) => rc.rectangle(el.x, el.y, el.width, el.height, options));
    getSectionRects(el)
      .slice(1)
      .forEach((rect, i) => {
        rc.line(rect.x, rect.y, rect.x + rect.width, rect.y, strokeOptions(el.style, el.seed + i + 1));
      });
  },

  hitTest(el, p, tolerance) {
    return containsPoint(expandBounds(el, tolerance + el.style.strokeWidth / 2), p);
  },

  resize(el, bounds) {
    const resized = { ...el, ...bounds };
    return { ...resized, height: Math.max(bounds.height, minCompartmentsHeight(resized)) };
  },

  getBorderOffset(el, d) {
    return scaleToBorder(d, Math.max(Math.abs(d.x) / (el.width / 2), Math.abs(d.y) / (el.height / 2)));
  },

  getConnectionPoints: () => [...SIDE_MIDPOINTS],
};
