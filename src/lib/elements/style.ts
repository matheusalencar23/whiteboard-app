import type { BoardElement, ElementStyle, ElementType } from "./types";

export type StyleProperty = keyof ElementStyle;

const STROKE_PROPERTIES: StyleProperty[] = [
  "strokeColor",
  "strokeWidth",
  "strokeStyle",
  "strokeRoughness",
  "strokeOpacity",
];

const FILL_PROPERTIES: StyleProperty[] = [
  "fillColor",
  "fillStyle",
  "fillRoughness",
  "fillOpacity",
];

const SHAPE_PROPERTIES = [...STROKE_PROPERTIES, ...FILL_PROPERTIES];

const STYLE_PROPERTIES: Record<ElementType, readonly StyleProperty[]> = {
  rectangle: SHAPE_PROPERTIES,
  ellipse: SHAPE_PROPERTIES,
  diamond: SHAPE_PROPERTIES,
  arrow: STROKE_PROPERTIES,
  freedraw: ["strokeColor", "strokeWidth", "strokeOpacity"],
  text: ["strokeColor", "strokeOpacity"],
};

export function supportsStyle(type: ElementType, property: StyleProperty): boolean {
  return STYLE_PROPERTIES[type].includes(property);
}

export function applyStyle<T extends BoardElement>(element: T, patch: Partial<ElementStyle>): T {
  const allowed = Object.entries(patch).filter(([key]) => supportsStyle(element.type, key as StyleProperty));
  if (allowed.every(([key, value]) => element.style[key as StyleProperty] === value)) return element;
  return { ...element, style: { ...element.style, ...Object.fromEntries(allowed) } };
}
