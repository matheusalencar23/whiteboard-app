import { nanoid } from "nanoid";
import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Options } from "roughjs/bin/core";
import type { Point } from "../types";
import type { Bounds } from "../geometry/bounds";
import { DEFAULT_STYLE, type BoardElement, type ElementStyle } from "./types";

export interface ShapeUtil<T extends BoardElement> {
  draw(element: T, rc: RoughCanvas, ctx: CanvasRenderingContext2D): void;
  hitTest(element: T, point: Point, tolerance: number): boolean;
  resize(element: T, bounds: Bounds): T;
  getBounds?(element: T): Bounds;
  getBorderOffset?(element: T, direction: Point): Point;
  getConnectionPoints?(element: T): Point[];
  getLabelArea?(element: T): Bounds;
}

export function centeredArea(el: Bounds, fx: number, fy: number): Bounds {
  const width = el.width * fx;
  const height = el.height * fy;
  return {
    x: el.x + (el.width - width) / 2,
    y: el.y + (el.height - height) / 2,
    width,
    height,
  };
}

export const SIDE_MIDPOINTS: readonly Point[] = [
  { x: 0.5, y: 0 },
  { x: 1, y: 0.5 },
  { x: 0.5, y: 1 },
  { x: 0, y: 0.5 },
];

export function scaleToBorder(direction: Point, s: number): Point {
  if (!Number.isFinite(s) || s === 0) return { x: 0, y: 0 };
  return { x: direction.x / s, y: direction.y / s };
}

export function baseFields(bounds: Bounds) {
  return {
    id: nanoid(),
    ...bounds,
    rotation: 0,
    style: { ...DEFAULT_STYLE },
    seed: rough.newSeed(),
  };
}

export function roughOptions(style: ElementStyle, seed: number): Options {
  return {
    seed,
    stroke: style.strokeColor,
    strokeWidth: style.strokeWidth,
    roughness: style.roughness,
    fill: style.fillColor === "transparent" ? undefined : style.fillColor,
  };
}

export function isFilled(style: ElementStyle): boolean {
  return style.fillColor !== "transparent";
}

export function resizeBox<T extends BoardElement>(element: T, bounds: Bounds): T {
  return { ...element, ...bounds };
}

export function scalePoints(points: Point[], from: Bounds, to: Bounds): Point[] {
  const sx = from.width === 0 ? 1 : to.width / from.width;
  const sy = from.height === 0 ? 1 : to.height / from.height;
  return points.map((p) => ({ x: p.x * sx, y: p.y * sy }));
}
