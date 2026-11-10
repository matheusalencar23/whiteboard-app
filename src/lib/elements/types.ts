import type { Point } from "../types";
import { theme } from "../theme";

export const FILL_STYLES = ["hachure", "cross-hatch", "solid"] as const;

export type FillStyle = (typeof FILL_STYLES)[number];

export const STROKE_STYLES = ["solid", "dashed", "dotted"] as const;

export type StrokeStyle = (typeof STROKE_STYLES)[number];

export const TRANSPARENT = "transparent";

export interface ElementStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  strokeRoughness: number;
  strokeOpacity: number;
  fillColor: string;
  fillStyle: FillStyle;
  fillRoughness: number;
  fillOpacity: number;
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

export const FONT_FAMILIES = ["hand", "sans", "mono"] as const;

export type FontFamily = (typeof FONT_FAMILIES)[number];

export const TEXT_ALIGNS = ["left", "center", "right"] as const;

export type TextAlign = (typeof TEXT_ALIGNS)[number];

export const VERTICAL_ALIGNS = ["top", "middle", "bottom"] as const;

export type VerticalAlign = (typeof VERTICAL_ALIGNS)[number];

export interface TextStyle {
  fontFamily: FontFamily;
  fontSize: number;
  color: string | null;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  verticalAlign: VerticalAlign;
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "hand",
  fontSize: 24,
  color: null,
  bold: false,
  italic: false,
  align: "left",
  verticalAlign: "middle",
};

export interface ShapeLabel {
  text: string;
  textStyle: TextStyle;
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

export const ARROWHEADS = [
  "none",
  "arrow",
  "bar",
  "cross",
  "triangle",
  "triangleOutline",
  "diamond",
  "diamondOutline",
  "circle",
  "circleOutline",
  "erOne",
  "erMandOne",
  "erMany",
  "erOneToMany",
  "erZeroToOne",
  "erZeroToMany",
] as const;

export type Arrowhead = (typeof ARROWHEADS)[number];

export interface ArrowheadPair {
  start: Arrowhead;
  end: Arrowhead;
}

export const DEFAULT_ARROWHEADS: ArrowheadPair = { start: "none", end: "arrow" };

export interface ArrowElement extends BaseElement {
  type: "arrow";
  points: Point[];
  routing: ArrowRouting;
  startArrowhead: Arrowhead;
  endArrowhead: Arrowhead;
  fixedSegments?: ArrowSegment[];
  startBinding: ArrowBinding | null;
  endBinding: ArrowBinding | null;
  label?: ShapeLabel;
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
  textStyle: TextStyle;
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

export type LabeledElement = BoxElement | ArrowElement;

export function isLabeledElement(element: BoardElement): element is LabeledElement {
  return isBoxElement(element) || element.type === "arrow";
}

export const DEFAULT_STYLE: ElementStyle = {
  strokeColor: theme.palette.ink,
  strokeWidth: 2,
  strokeStyle: "solid",
  strokeRoughness: 1,
  strokeOpacity: 100,
  fillColor: TRANSPARENT,
  fillStyle: "hachure",
  fillRoughness: 1,
  fillOpacity: 100,
};
