import type { ArrowElement, ElementStyle, ElementType } from "../../../lib/elements/types";
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

export function scopeSupports(scope: string, property: StyleProperty): boolean {
  return scope.split(",").some((type) => supportsStyle(type as ElementType, property));
}

function selectStyleField<K extends StyleProperty>(key: K) {
  return (state: BoardState): ElementStyle[K] | "mixed" => {
    const ids = new Set(state.selectedIds);
    let value: ElementStyle[K] | null = null;
    for (const el of state.elements) {
      if (!ids.has(el.id) || !supportsStyle(el.type, key)) continue;
      if (value === null) value = el.style[key];
      else if (value !== el.style[key]) return "mixed";
    }
    return value ?? state.currentStyle[key];
  };
}

export const styleSelectors: { [K in StyleProperty]: (state: BoardState) => ElementStyle[K] | "mixed" } = {
  strokeColor: selectStyleField("strokeColor"),
  strokeWidth: selectStyleField("strokeWidth"),
  strokeStyle: selectStyleField("strokeStyle"),
  strokeRoughness: selectStyleField("strokeRoughness"),
  strokeOpacity: selectStyleField("strokeOpacity"),
  fillColor: selectStyleField("fillColor"),
  fillStyle: selectStyleField("fillStyle"),
  fillRoughness: selectStyleField("fillRoughness"),
  fillOpacity: selectStyleField("fillOpacity"),
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
