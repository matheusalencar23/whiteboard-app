import type { Point } from "../../types";
import { containsPoint, expandBounds, getCenter, type Bounds } from "../../geometry/bounds";
import { rotatePoint } from "../../geometry/distance";
import { drawTextLines, layoutText, lineHeight, measureText } from "../../text";
import { theme } from "../../theme";
import { baseFields, drawFill, scaleToBorder, strokeOptions, type ShapeUtil } from "../shapeUtil";
import type { TableCell, TableElement, TextAlign, TextStyle } from "../types";
import { resolveTextColor } from "./text";

const PADDING_X = 10;
const PADDING_Y = 6;
const PASTED_COLUMN_MIN = 60;
const PASTED_COLUMN_MAX = 320;
const PASTED_COLUMN_SLACK = 4;

export const MIN_COLUMN_WIDTH = 30;

export const DEFAULT_HEADER_FILL = theme.palette.grayLight;

export interface CellPosition {
  row: number;
  column: number;
}

export function sameCell(a: CellPosition | null, b: CellPosition | null): boolean {
  return a !== null && b !== null && a.row === b.row && a.column === b.column;
}

export const TITLE_ROW = -1;

export const TITLE_PLACEHOLDER = "Título";

export function hasTitle(el: TableElement): boolean {
  return el.title !== undefined;
}

export function isTitleCell(cell: CellPosition): boolean {
  return cell.row === TITLE_ROW;
}

export function clampCell(el: TableElement, cell: CellPosition): CellPosition {
  const row = Math.min(Math.max(cell.row, hasTitle(el) ? TITLE_ROW : 0), el.cells.length - 1);
  if (row === TITLE_ROW) return { row, column: 0 };
  return { row, column: Math.min(Math.max(cell.column, 0), el.columns.length - 1) };
}

export function getCellText(el: TableElement, cell: CellPosition): string {
  return isTitleCell(cell) ? (el.title ?? "") : el.cells[cell.row][cell.column].text;
}

export function isHeaderCell(el: TableElement, row: number): boolean {
  return row === 0 && el.headerRow;
}

export function getColumnAlign(el: TableElement, column: number): TextAlign {
  return el.columnAligns?.[column] ?? el.textStyle.align;
}

function getTitleTextStyle(el: TableElement): TextStyle {
  return { ...el.textStyle, bold: true, align: "center" };
}

export function getCellTextStyle(el: TableElement, row: number, column: number): TextStyle {
  if (row === TITLE_ROW) return getTitleTextStyle(el);
  const align = getColumnAlign(el, column);
  const bold = isHeaderCell(el, row) || el.textStyle.bold;
  if (align === el.textStyle.align && bold === el.textStyle.bold) return el.textStyle;
  return { ...el.textStyle, align, bold };
}

export function getCellFill(el: TableElement, { row, column }: CellPosition): string {
  if (row === TITLE_ROW) return el.headerFill;
  return el.cells[row][column].fill ?? (isHeaderCell(el, row) ? el.headerFill : el.style.fillColor);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function offsets(sizes: number[], start: number): number[] {
  const result: number[] = [];
  let position = start;
  for (const size of sizes) {
    result.push(position);
    position += size;
  }
  return result;
}

function innerWidth(columnWidth: number): number {
  return Math.max(columnWidth - PADDING_X * 2, 1);
}

function cellMinHeight(cell: TableCell, style: TextStyle, columnWidth: number): number {
  const { height } = layoutText(cell.text, style, innerWidth(columnWidth));
  return Math.max(height, lineHeight(style)) + PADDING_Y * 2;
}

function minRowHeights(el: TableElement): number[] {
  return el.cells.map((row, r) =>
    Math.max(...row.map((cell, c) => cellMinHeight(cell, getCellTextStyle(el, r, c), el.columns[c]))),
  );
}

function getTitleHeight(el: TableElement): number {
  return el.title === undefined ? 0 : cellMinHeight({ text: el.title }, getTitleTextStyle(el), el.width);
}

function minTableHeight(el: TableElement): number {
  return getTitleHeight(el) + sum(minRowHeights(el));
}

function getDataTop(el: TableElement): number {
  return el.y + getTitleHeight(el);
}

export function getRowHeights(el: TableElement): number[] {
  const mins = minRowHeights(el);
  const extra = Math.max(el.height - getTitleHeight(el) - sum(mins), 0) / mins.length;
  return mins.map((height) => height + extra);
}

export function getColumnLefts(el: TableElement): number[] {
  return offsets(el.columns, el.x);
}

export function getCellRect(el: TableElement, { row, column }: CellPosition): Bounds {
  if (row === TITLE_ROW) return { x: el.x, y: el.y, width: el.width, height: getTitleHeight(el) };
  const heights = getRowHeights(el);
  const tops = offsets(heights, getDataTop(el));
  return { x: getColumnLefts(el)[column], y: tops[row], width: el.columns[column], height: heights[row] };
}

export function getCellTextArea(el: TableElement, cell: CellPosition): Bounds {
  const rect = getCellRect(el, cell);
  return {
    x: rect.x + PADDING_X,
    y: rect.y + PADDING_Y,
    width: innerWidth(rect.width),
    height: Math.max(rect.height - PADDING_Y * 2, 0),
  };
}

function indexAt(starts: number[], sizes: number[], value: number): number {
  const index = starts.findIndex((start, i) => value < start + sizes[i]);
  return index === -1 ? sizes.length - 1 : index;
}

export function getCellAt(el: TableElement, localPoint: Point): CellPosition {
  const top = getDataTop(el);
  if (hasTitle(el) && localPoint.y < top) return { row: TITLE_ROW, column: 0 };
  const heights = getRowHeights(el);
  return {
    row: indexAt(offsets(heights, top), heights, localPoint.y),
    column: indexAt(getColumnLefts(el), el.columns, localPoint.x),
  };
}

export function getColumnBorderAt(el: TableElement, localPoint: Point, tolerance: number): number | null {
  if (localPoint.y < getDataTop(el) - tolerance || localPoint.y > el.y + el.height + tolerance) return null;
  const lefts = getColumnLefts(el);
  for (let i = 1; i < lefts.length; i++) {
    if (Math.abs(localPoint.x - lefts[i]) <= tolerance) return i - 1;
  }
  return null;
}

function withSize(el: TableElement, width: number, height: number): TableElement {
  if (width === el.width && height === el.height) return el;
  if (el.rotation === 0) return { ...el, width, height };
  const corner = rotatePoint({ x: el.x, y: el.y }, getCenter(el), el.rotation);
  const half = rotatePoint({ x: width / 2, y: height / 2 }, { x: 0, y: 0 }, el.rotation);
  const center = { x: corner.x + half.x, y: corner.y + half.y };
  return { ...el, width, height, x: center.x - width / 2, y: center.y - height / 2 };
}

export function fitTable(el: TableElement): TableElement {
  return withSize(el, sum(el.columns), Math.max(el.height, minTableHeight(el)));
}

function emptyRow(columnCount: number): TableCell[] {
  return Array.from({ length: columnCount }, () => ({ text: "" }));
}

export interface TableOptions {
  columns?: number[];
  title?: string;
  headerRow?: boolean;
}

export function createTable(
  bounds: Bounds,
  rows: string[][],
  textStyle: TextStyle,
  { columns, title, headerRow = true }: TableOptions = {},
): TableElement {
  const columnCount = Math.max(1, columns?.length ?? 0, ...rows.map((row) => row.length));
  const cells = rows.map((row) => Array.from({ length: columnCount }, (_, c) => ({ text: row[c] ?? "" })));
  const widths = columns ?? Array.from({ length: columnCount }, () => bounds.width / columnCount);
  const table: TableElement = {
    ...baseFields(bounds),
    type: "table",
    columns: widths,
    cells: cells.length > 0 ? cells : [emptyRow(columnCount)],
    textStyle,
    headerRow,
    headerFill: DEFAULT_HEADER_FILL,
  };
  return fitTable(title === undefined ? table : { ...table, title });
}

export function parseTableText(text: string): string[][] | null {
  if (!text.includes("\t")) return null;
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  return lines.map((line) => line.split("\t"));
}

export function createTableFromRows(rows: string[][], center: Point, textStyle: TextStyle): TableElement {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const columns = Array.from({ length: columnCount }, (_, c) => {
    const widest = Math.max(
      0,
      ...rows.map((row, r) => measureText(row[c] ?? "", r === 0 ? { ...textStyle, bold: true } : textStyle).width),
    );
    const width = widest + PADDING_X * 2 + PASTED_COLUMN_SLACK;
    return Math.min(Math.max(width, PASTED_COLUMN_MIN), PASTED_COLUMN_MAX);
  });
  const table = createTable({ x: center.x, y: center.y, width: sum(columns), height: 0 }, rows, textStyle, { columns });
  return { ...table, x: center.x - table.width / 2, y: center.y - table.height / 2 };
}

function mapCell(el: TableElement, target: CellPosition, update: (cell: TableCell) => TableCell): TableCell[][] {
  return el.cells.map((row, r) =>
    r === target.row ? row.map((cell, c) => (c === target.column ? update(cell) : cell)) : row,
  );
}

export function setCellText(el: TableElement, cell: CellPosition, text: string): TableElement {
  if (isTitleCell(cell)) return el.title === undefined || el.title === text ? el : fitTable({ ...el, title: text });
  if (el.cells[cell.row]?.[cell.column]?.text === text) return el;
  return fitTable({ ...el, cells: mapCell(el, cell, (current) => ({ ...current, text })) });
}

export function setCellFill(el: TableElement, cell: CellPosition, fill: string | undefined): TableElement {
  if (isTitleCell(cell)) return el;
  if (el.cells[cell.row][cell.column].fill === fill) return el;
  const cells = mapCell(el, cell, ({ text }) => (fill === undefined ? { text } : { text, fill }));
  return { ...el, cells };
}

export function setHeaderFill(el: TableElement, headerFill: string): TableElement {
  return el.headerFill === headerFill ? el : { ...el, headerFill };
}

export function setHeaderRow(el: TableElement, headerRow: boolean): TableElement {
  return el.headerRow === headerRow ? el : fitTable({ ...el, headerRow });
}

export function setTitle(el: TableElement, title: string | undefined): TableElement {
  if (el.title === title) return el;
  if (title !== undefined) return fitTable({ ...el, title });
  const next = { ...el };
  delete next.title;
  return fitTable(withSize(next, el.width, el.height - getTitleHeight(el)));
}

export function insertRow(el: TableElement, index: number): TableElement {
  const cells = [...el.cells.slice(0, index), emptyRow(el.columns.length), ...el.cells.slice(index)];
  const next = { ...el, cells };
  const added = minRowHeights(next)[index];
  return fitTable(withSize(next, el.width, el.height + added));
}

export function deleteRow(el: TableElement, index: number): TableElement {
  if (el.cells.length <= 1) return el;
  const removed = getRowHeights(el)[index];
  const cells = el.cells.filter((_, r) => r !== index);
  return fitTable(withSize({ ...el, cells }, el.width, el.height - removed));
}

function withColumnAligns(el: TableElement, aligns: (TextAlign | null)[] | undefined): TableElement {
  if (aligns && aligns.some((align) => align !== null)) return { ...el, columnAligns: aligns };
  const next = { ...el };
  delete next.columnAligns;
  return next;
}

export function insertColumn(el: TableElement, index: number): TableElement {
  const width = el.columns[Math.min(index, el.columns.length - 1)];
  const columns = [...el.columns.slice(0, index), width, ...el.columns.slice(index)];
  const cells = el.cells.map((row) => [...row.slice(0, index), { text: "" }, ...row.slice(index)]);
  const aligns = el.columnAligns && [...el.columnAligns.slice(0, index), null, ...el.columnAligns.slice(index)];
  return fitTable(withColumnAligns({ ...el, columns, cells }, aligns));
}

export function deleteColumn(el: TableElement, index: number): TableElement {
  if (el.columns.length <= 1) return el;
  const columns = el.columns.filter((_, c) => c !== index);
  const cells = el.cells.map((row) => row.filter((_, c) => c !== index));
  const aligns = el.columnAligns?.filter((_, c) => c !== index);
  return fitTable(withColumnAligns({ ...el, columns, cells }, aligns));
}

export function setColumnAlign(el: TableElement, column: number, align: TextAlign): TableElement {
  if (getColumnAlign(el, column) === align) return el;
  const current = el.columnAligns ?? el.columns.map(() => null);
  const aligns = current.map((value, c) => (c === column ? (align === el.textStyle.align ? null : align) : value));
  return fitTable(withColumnAligns(el, aligns));
}

export function clearColumnAligns(el: TableElement): TableElement {
  return el.columnAligns ? withColumnAligns(el, undefined) : el;
}

export type TableSide = "left" | "right";

interface RowCenter {
  row: number;
  y: number;
}

function rowCenters(el: TableElement): RowCenter[] {
  const fraction = (y: number) => (el.height > 0 ? y / el.height : 0.5);
  const titleHeight = getTitleHeight(el);
  const heights = getRowHeights(el);
  const rows = offsets(heights, titleHeight).map((top, r) => ({ row: r, y: fraction(top + heights[r] / 2) }));
  return hasTitle(el) ? [{ row: TITLE_ROW, y: fraction(titleHeight / 2) }, ...rows] : rows;
}

export function getRowAnchor(el: TableElement, row: number, side: TableSide): Point {
  const centers = rowCenters(el);
  const center = centers.find((entry) => entry.row === row) ?? centers[row < 0 ? 0 : centers.length - 1];
  return { x: side === "left" ? 0 : 1, y: center.y };
}

export function getTableConnectionPoints(el: TableElement): Point[] {
  const centers = rowCenters(el);
  return [
    { x: 0.5, y: 0 },
    ...centers.map(({ y }) => ({ x: 1, y })),
    { x: 0.5, y: 1 },
    ...centers.map(({ y }) => ({ x: 0, y })),
  ];
}

export function getAnchorRow(el: TableElement, anchor: Point): number | undefined {
  if (anchor.x !== 0 && anchor.x !== 1) return undefined;
  return rowCenters(el).find(({ y }) => y === anchor.y)?.row;
}

export function setColumnWidth(el: TableElement, index: number, width: number): TableElement {
  const next = Math.max(width, MIN_COLUMN_WIDTH);
  if (el.columns[index] === next) return el;
  const columns = el.columns.map((current, c) => (c === index ? next : current));
  return fitTable({ ...el, columns });
}

function drawCellText(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: TextStyle,
  color: string,
  rect: Bounds,
) {
  const area = { x: rect.x + PADDING_X, width: innerWidth(rect.width) };
  const { lines, height } = layoutText(text, style, area.width);
  const room = rect.height - PADDING_Y * 2;
  const offset =
    style.verticalAlign === "top" ? 0 : style.verticalAlign === "bottom" ? room - height : (room - height) / 2;
  drawTextLines(ctx, lines, style, color, area, rect.y + PADDING_Y + offset);
}

export function drawTableText(el: TableElement, ctx: CanvasRenderingContext2D, hidden: CellPosition | null) {
  const heights = getRowHeights(el);
  const tops = offsets(heights, getDataTop(el));
  const lefts = getColumnLefts(el);
  const color = resolveTextColor(el.textStyle, el);
  const title = { row: TITLE_ROW, column: 0 };
  if (el.title && !sameCell(hidden, title)) {
    drawCellText(ctx, el.title, getTitleTextStyle(el), color, getCellRect(el, title));
  }
  el.cells.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell.text === "" || sameCell(hidden, { row: r, column: c })) return;
      const rect = { x: lefts[c], y: tops[r], width: el.columns[c], height: heights[r] };
      drawCellText(ctx, cell.text, getCellTextStyle(el, r, c), color, rect);
    });
  });
}

export const tableUtil: ShapeUtil<TableElement> = {
  draw(el, rc, ctx) {
    const heights = getRowHeights(el);
    const dataTop = getDataTop(el);
    const tops = offsets(heights, dataTop);
    const lefts = getColumnLefts(el);
    const columnCount = el.columns.length;
    if (hasTitle(el)) {
      drawFill(ctx, { ...el.style, fillColor: el.headerFill }, el.seed - 1, (options) =>
        rc.rectangle(el.x, el.y, el.width, dataTop - el.y, options),
      );
    }
    el.cells.forEach((row, r) =>
      row.forEach((_, c) => {
        const style = { ...el.style, fillColor: getCellFill(el, { row: r, column: c }) };
        drawFill(ctx, style, el.seed + r * columnCount + c, (options) =>
          rc.rectangle(lefts[c], tops[r], el.columns[c], heights[r], options),
        );
      }),
    );
    rc.rectangle(el.x, el.y, el.width, el.height, strokeOptions(el.style, el.seed));
    let seed = el.seed + 1;
    for (const y of hasTitle(el) ? tops : tops.slice(1)) {
      rc.line(el.x, y, el.x + el.width, y, strokeOptions(el.style, seed++));
    }
    for (const x of lefts.slice(1)) rc.line(x, dataTop, x, el.y + el.height, strokeOptions(el.style, seed++));
  },

  hitTest(el, p, tolerance) {
    return containsPoint(expandBounds(el, tolerance + el.style.strokeWidth / 2), p);
  },

  resize(el, bounds) {
    const factor = el.width > 0 ? bounds.width / el.width : 1;
    const resized = { ...el, ...bounds, columns: el.columns.map((width) => width * factor) };
    return { ...resized, height: Math.max(bounds.height, minTableHeight(resized)) };
  },

  getBorderOffset(el, d) {
    return scaleToBorder(d, Math.max(Math.abs(d.x) / (el.width / 2), Math.abs(d.y) / (el.height / 2)));
  },

  getConnectionPoints: getTableConnectionPoints,
};
