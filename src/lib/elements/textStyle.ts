import { FONT_SIZE_PRESETS } from "../text";
import { setText } from "./shapes/text";
import { fitCompartments } from "./shapes/compartments";
import { clearCellTextStyles, clearColumnAligns, fitTable } from "./shapes/table";
import { isLabeledElement, type BoardElement, type TableElement, type TextStyle } from "./types";

export function getTextStyle(element: BoardElement): TextStyle | null {
  if (element.type === "text" || element.type === "compartments" || element.type === "table") return element.textStyle;
  if (isLabeledElement(element) && element.label) return element.label.textStyle;
  return null;
}

function sameStyle(a: TextStyle, b: TextStyle): boolean {
  return (Object.keys(a) as (keyof TextStyle)[]).every((key) => a[key] === b[key]);
}

export function applyTextStyle<T extends BoardElement>(element: T, patch: Partial<TextStyle>): T {
  const current = getTextStyle(element);
  if (!current) return element;
  const textStyle = { ...current, ...patch };
  if (element.type === "table") {
    const aligned: TableElement = patch.align === undefined ? element : clearColumnAligns(element);
    const table = clearCellTextStyles(aligned, patch);
    if (table === element && sameStyle(current, textStyle)) return element;
    return fitTable({ ...table, textStyle }) as T;
  }
  if (sameStyle(current, textStyle)) return element;
  if (element.type === "text") return setText(element, element.text, textStyle) as T;
  if (element.type === "compartments") return fitCompartments({ ...element, textStyle }) as T;
  if (isLabeledElement(element) && element.label) {
    return { ...element, label: { ...element.label, textStyle } };
  }
  return element;
}

export function stepFontSize(fontSize: number, direction: 1 | -1): number {
  if (direction > 0) return FONT_SIZE_PRESETS.find((size) => size > fontSize) ?? fontSize;
  return [...FONT_SIZE_PRESETS].reverse().find((size) => size < fontSize) ?? fontSize;
}
