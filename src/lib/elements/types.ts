import type { Point } from "../types";

export interface ElementStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  roughness: number;
}

interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  style: ElementStyle;
  seed: number;
}

export interface ShapeLabel {
  text: string;
  fontSize: number;
}

interface BoxBaseElement extends BaseElement {
  label?: ShapeLabel;
}

export interface RectangleElement extends BoxBaseElement {
  type: "rectangle";
}

export interface EllipseElement extends BoxBaseElement {
  type: "ellipse";
}

export interface DiamondElement extends BoxBaseElement {
  type: "diamond";
}

export type ArrowRouting = "straight" | "elbow" | "curved";

export interface ArrowElement extends BaseElement {
  type: "arrow";
  points: Point[];
  routing: ArrowRouting;
  fixedSegments?: ArrowSegment[];
  startBinding: ArrowBinding | null;
  endBinding: ArrowBinding | null;
}

export interface ArrowSegment {
  start: Point;
  end: Point;
}

export interface ArrowBinding {
  elementId: string;
  anchor: Point;
  fixed: boolean;
}

export interface FreedrawElement extends BaseElement {
  type: "freedraw";
  points: Point[];
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
}

export type BoardElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | ArrowElement
  | FreedrawElement
  | TextElement;

export type ElementType = BoardElement["type"];

export type ElementOfType<T extends ElementType> = Extract<BoardElement, { type: T }>;

export type BoxElementType = "rectangle" | "ellipse" | "diamond";

export type BoxElement = ElementOfType<BoxElementType>;

export function isBoxElement(element: BoardElement): element is BoxElement {
  return element.type === "rectangle" || element.type === "ellipse" || element.type === "diamond";
}

export const DEFAULT_STYLE: ElementStyle = {
  strokeColor: "#1e1e1e",
  fillColor: "transparent",
  strokeWidth: 2,
  roughness: 1,
};
