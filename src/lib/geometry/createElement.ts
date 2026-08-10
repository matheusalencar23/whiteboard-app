import { nanoid } from "nanoid";
import type { DrawingTool } from "../canvas/types";
import type {
  ArrowElement,
  ArrowheadType,
  CanvasElement,
  EllipseElement,
  LineElement,
  Point,
  RectangleElement,
  TextElement,
} from "./types";
import { measureText } from "./shapes/text";

interface NewElementInput {
  x: number;
  y: number;
  width?: number;
  height?: number;
  angle?: number;
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  bowing?: number;
  fill?: string | null;
  fillStyle?: string;
  points?: Point[];
  startArrowhead?: ArrowheadType;
  endArrowhead?: ArrowheadType;
}

const DEFAULT_STYLE = {
  stroke: "#000000",
  strokeWidth: 1.5,
  roughness: 1.5,
  bowing: 1,
  fill: null as string | null,
  fillStyle: "hachure",
};

const DEFAULT_FONT_SIZE = 20;

export function createElement(
  tool: DrawingTool,
  input: NewElementInput,
): CanvasElement {
  const id = nanoid();
  const seed = Math.floor(Math.random() * 10000);
  const style = { ...DEFAULT_STYLE, ...input };
  const angle = input.angle ?? 0;

  switch (tool) {
    case "rectangle":
      return {
        id,
        type: "rectangle",
        angle,
        seed,
        x: input.x,
        y: input.y,
        width: input.width ?? 0,
        height: input.height ?? 0,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        roughness: style.roughness,
        bowing: style.bowing,
        fill: style.fill,
        fillStyle: style.fillStyle,
      } satisfies RectangleElement;
    case "ellipse":
      return {
        id,
        type: "ellipse",
        angle,
        seed,
        x: input.x,
        y: input.y,
        width: input.width ?? 0,
        height: input.height ?? 0,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        roughness: style.roughness,
        bowing: style.bowing,
        fill: style.fill,
        fillStyle: style.fillStyle,
      } satisfies EllipseElement;
    case "line":
      return {
        id,
        type: "line",
        angle,
        seed,
        x: input.x,
        y: input.y,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        roughness: style.roughness,
        bowing: style.bowing,
        points: input.points ?? [{ x: 0, y: 0 }],
      } satisfies LineElement;

    case "arrow":
      return {
        id,
        type: "arrow",
        angle,
        seed,
        x: input.x,
        y: input.y,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        roughness: style.roughness,
        bowing: style.bowing,
        points: input.points ?? [{ x: 0, y: 0 }],
        startArrowhead: input.startArrowhead ?? "none",
        endArrowhead: input.endArrowhead ?? "triangle",
      } satisfies ArrowElement;
    case "text": {
      const { width, height } = measureText("", DEFAULT_FONT_SIZE);
      return {
        id,
        type: "text",
        angle,
        seed,
        x: input.x,
        y: input.y,
        width,
        height,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        roughness: style.roughness,
        bowing: style.bowing,
        text: "",
        fontSize: DEFAULT_FONT_SIZE,
      } satisfies TextElement;
    }
  }
}

export function cloneElement<T extends CanvasElement>(
  el: T,
  overrides: Partial<Omit<T, "id" | "type">>,
): T {
  return { ...el, ...overrides };
}

export function duplicateElement(
  el: CanvasElement,
  offset: Point = { x: 20, y: 20 },
): CanvasElement {
  return { ...el, id: nanoid(), x: el.x + offset.x, y: el.y + offset.y };
}
