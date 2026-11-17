import { adaptColor } from "../colors";
import type { ColorScheme } from "../theme";
import type { BoardElement, CellTextStyle, ElementStyle, ShapeLabel, TableCell, TextStyle } from "./types";

type Adapt = (color: string) => string;

function adaptStyle(style: ElementStyle, adapt: Adapt): ElementStyle {
  return { ...style, strokeColor: adapt(style.strokeColor), fillColor: adapt(style.fillColor) };
}

function adaptTextStyle<T extends TextStyle | CellTextStyle>(textStyle: T, adapt: Adapt): T {
  return textStyle.color ? { ...textStyle, color: adapt(textStyle.color) } : textStyle;
}

function adaptLabel(label: ShapeLabel | undefined, adapt: Adapt): ShapeLabel | undefined {
  return label && { ...label, textStyle: adaptTextStyle(label.textStyle, adapt) };
}

function adaptCell(cell: TableCell, adapt: Adapt): TableCell {
  if (cell.fill === undefined && !cell.textStyle?.color) return cell;
  return {
    ...cell,
    fill: cell.fill === undefined ? undefined : adapt(cell.fill),
    textStyle: cell.textStyle && adaptTextStyle(cell.textStyle, adapt),
  };
}

function adaptElement(element: BoardElement, adapt: Adapt): BoardElement {
  const style = adaptStyle(element.style, adapt);
  switch (element.type) {
    case "rectangle":
    case "ellipse":
    case "diamond":
    case "shape":
    case "arrow":
      return { ...element, style, label: adaptLabel(element.label, adapt) };
    case "text":
    case "compartments":
      return { ...element, style, textStyle: adaptTextStyle(element.textStyle, adapt) };
    case "table":
      return {
        ...element,
        style,
        textStyle: adaptTextStyle(element.textStyle, adapt),
        headerFill: adapt(element.headerFill),
        cells: element.cells.map((row) => row.map((cell) => adaptCell(cell, adapt))),
      };
    case "freedraw":
      return { ...element, style };
  }
}

const darkElements = new WeakMap<BoardElement, BoardElement>();

const toDark: Adapt = (color) => adaptColor(color, "dark");

export function adaptElementColors(element: BoardElement, scheme: ColorScheme): BoardElement {
  if (scheme === "light") return element;
  let adapted = darkElements.get(element);
  if (!adapted) {
    adapted = adaptElement(element, toDark);
    darkElements.set(element, adapted);
  }
  return adapted;
}
