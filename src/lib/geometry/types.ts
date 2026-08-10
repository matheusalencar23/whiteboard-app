export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HandleType =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "rotation";

interface ElementBase {
  id: string;
  x: number;
  y: number;
  angle: number;
  stroke: string;
  strokeWidth: number;
  roughness: number;
  bowing: number;
  seed: number;
}

interface LinearElementBase extends ElementBase {
  points: Point[];
}

export interface RectangleElement extends ElementBase {
  type: "rectangle";
  width: number;
  height: number;
  fill: string | null;
  fillStyle: string;
}

export interface EllipseElement extends ElementBase {
  type: "ellipse";
  width: number;
  height: number;
  fill: string | null;
  fillStyle: string;
}

export interface TextElement extends ElementBase {
  type: "text";
  width: number;
  height: number;
  text: string;
  fontSize: number;
}

export interface LineElement extends LinearElementBase {
  type: "line";
}

export type ArrowheadType = "none" | "triangle";

export interface ArrowElement extends LinearElementBase {
  type: "arrow";
  startArrowhead: ArrowheadType;
  endArrowhead: ArrowheadType;
}

export type CanvasElement =
  | RectangleElement
  | EllipseElement
  | LineElement
  | ArrowElement
  | TextElement;
