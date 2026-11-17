import {
  DEFAULT_STYLE,
  DEFAULT_TEXT_STYLE,
  type ArrowElement,
  type BoardElement,
  type ElementStyle,
  type ElementType,
  type TableElement,
  type TextStyle,
} from "../../../lib/elements/types";
import { getTextStyle } from "../../../lib/elements/textStyle";
import { supportsStyle, type StyleProperty } from "../../../lib/elements/style";
import type { BoardState } from "../../../store/boardStore";

const DRAWING_TOOLS: readonly string[] = [
  "rectangle",
  "ellipse",
  "diamond",
  "arrow",
  "freedraw",
  "text",
] satisfies ElementType[];

export function selectScope(state: BoardState): string {
  if (state.selectedIds.length > 0) {
    const ids = new Set(state.selectedIds);
    const types = new Set(state.elements.filter((el) => ids.has(el.id)).map((el) => el.type));
    return [...types].sort().join(",");
  }
  return DRAWING_TOOLS.includes(state.tool) ? state.tool : "";
}

export function selectSingleTable(state: BoardState): TableElement | null {
  if (state.selectedIds.length !== 1) return null;
  const element = state.elements.find((el) => el.id === state.selectedIds[0]);
  return element?.type === "table" ? element : null;
}

export function scopeSupports(scope: string, property: StyleProperty): boolean {
  return scope.split(",").some((type) => supportsStyle(type as ElementType, property));
}

type StyleValue<K extends StyleProperty> = Required<ElementStyle>[K];

function styleValue<K extends StyleProperty>(style: ElementStyle, key: K): StyleValue<K> {
  return (style[key] ?? DEFAULT_STYLE[key]) as StyleValue<K>;
}

function selectStyleField<K extends StyleProperty>(key: K) {
  return (state: BoardState): StyleValue<K> | "mixed" => {
    const ids = new Set(state.selectedIds);
    let value: StyleValue<K> | null = null;
    for (const el of state.elements) {
      if (!ids.has(el.id) || !supportsStyle(el.type, key)) continue;
      const current = styleValue(el.style, key);
      if (value === null) value = current;
      else if (value !== current) return "mixed";
    }
    return value ?? styleValue(state.currentStyle, key);
  };
}

export const styleSelectors: { [K in StyleProperty]: (state: BoardState) => StyleValue<K> | "mixed" } = {
  strokeColor: selectStyleField("strokeColor"),
  strokeWidth: selectStyleField("strokeWidth"),
  strokeStyle: selectStyleField("strokeStyle"),
  strokeRoughness: selectStyleField("strokeRoughness"),
  strokeOpacity: selectStyleField("strokeOpacity"),
  fillColor: selectStyleField("fillColor"),
  fillStyle: selectStyleField("fillStyle"),
  fillRoughness: selectStyleField("fillRoughness"),
  fillOpacity: selectStyleField("fillOpacity"),
  corners: selectStyleField("corners"),
};

type ArrowField = "routing" | "startArrowhead" | "endArrowhead";

function selectArrowField<K extends ArrowField>(key: K) {
  return (state: BoardState): ArrowElement[K] | "mixed" | null => {
    const ids = new Set(state.selectedIds);
    let value: ArrowElement[K] | null = null;
    for (const el of state.elements) {
      if (el.type !== "arrow" || !ids.has(el.id)) continue;
      if (value === null) value = el[key];
      else if (value !== el[key]) return "mixed";
    }
    return value;
  };
}

export const arrowSelectors = {
  routing: selectArrowField("routing"),
  startArrowhead: selectArrowField("startArrowhead"),
  endArrowhead: selectArrowField("endArrowhead"),
};

export function selectTextScope(state: BoardState): string {
  const kinds = new Set<string>();
  if (state.selectedIds.length > 0) {
    const ids = new Set(state.selectedIds);
    for (const el of state.elements) {
      if (!ids.has(el.id) || !getTextStyle(el)) continue;
      kinds.add(el.type === "text" || el.type === "compartments" ? "free" : el.type === "arrow" ? "arrow" : "box");
    }
  } else if (state.tool === "text") {
    kinds.add("free");
  }
  return [...kinds].sort().join(",");
}

function selectTextField<K extends keyof TextStyle>(key: K, accepts: (el: BoardElement) => boolean = () => true) {
  return (state: BoardState): TextStyle[K] | "mixed" => {
    const ids = new Set(state.selectedIds);
    let found = false;
    let value: TextStyle[K] | undefined;
    for (const el of state.elements) {
      const textStyle = ids.has(el.id) && accepts(el) ? getTextStyle(el) : null;
      if (!textStyle) continue;
      const current = textStyle[key] ?? DEFAULT_TEXT_STYLE[key];
      if (!found) {
        found = true;
        value = current;
      } else if (value !== current) {
        return "mixed";
      }
    }
    return found ? (value as TextStyle[K]) : state.currentTextStyle[key];
  };
}

export const textSelectors = {
  fontFamily: selectTextField("fontFamily"),
  fontSize: selectTextField("fontSize"),
  color: selectTextField("color"),
  bold: selectTextField("bold"),
  italic: selectTextField("italic"),
  underline: selectTextField("underline"),
  align: selectTextField("align", (el) => el.type !== "arrow"),
  verticalAlign: selectTextField(
    "verticalAlign",
    (el) => el.type !== "arrow" && el.type !== "text" && el.type !== "compartments",
  ),
};
