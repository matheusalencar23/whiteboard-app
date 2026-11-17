import type { Point } from "../../types";
import { containsPoint, expandBounds, getCenter, type Bounds } from "../../geometry/bounds";
import { rotatePoint } from "../../geometry/distance";
import { drawTextLines, layoutText, lineHeight, measureText } from "../../text";
import { theme } from "../../theme";
import { baseFields, drawFill, scaleToBorder, strokeOptions, type ShapeUtil } from "../shapeUtil";
import { CELL_TEXT_KEYS, type CellTextStyle, type TableCell, type TableElement, type TextAlign, type TextStyle } from "../types";
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

export interface CellRange {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

const coverageCache = new WeakMap<TableCell[][], CellPosition[][]>();

export function getRowSpan(cell: TableCell): number {
  return cell.rowSpan ?? 1;
}

export function getColSpan(cell: TableCell): number {
  return cell.colSpan ?? 1;
}

function getCoverage(el: TableElement): CellPosition[][] {
  const cached = coverageCache.get(el.cells);
  if (cached) return cached;
  const coverage = el.cells.map((row, r) => row.map((_, c) => ({ row: r, column: c })));
  el.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (getRowSpan(cell) === 1 && getColSpan(cell) === 1) return;
      for (let i = r; i < r + getRowSpan(cell) && i < el.cells.length; i++) {
        for (let j = c; j < c + getColSpan(cell) && j < row.length; j++) coverage[i][j] = { row: r, column: c };
      }
    }),
  );
  coverageCache.set(el.cells, coverage);
  return coverage;
}

function isOrigin(coverage: CellPosition[][], row: number, column: number): boolean {
  const origin = coverage[row][column];
  return origin.row === row && origin.column === column;
}

export function resolveCell(el: TableElement, cell: CellPosition): CellPosition {
  return cell.row === TITLE_ROW ? cell : getCoverage(el)[cell.row][cell.column];
}

export function isMergedCell(el: TableElement, position: CellPosition): boolean {
  if (position.row === TITLE_ROW) return false;
  const cell = resolveCell(el, position);
  const origin = el.cells[cell.row][cell.column];
  return getRowSpan(origin) > 1 || getColSpan(origin) > 1;
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
  return resolveCell(el, { row, column: Math.min(Math.max(cell.column, 0), el.columns.length - 1) });
}

export function getCellText(el: TableElement, position: CellPosition): string {
  if (isTitleCell(position)) return el.title ?? "";
  const cell = resolveCell(el, position);
  return el.cells[cell.row][cell.column].text;
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

function getBaseCellTextStyle(el: TableElement, row: number, column: number): TextStyle {
  const align = getColumnAlign(el, column);
  const bold = isHeaderCell(el, row) || el.textStyle.bold;
  if (align === el.textStyle.align && bold === el.textStyle.bold) return el.textStyle;
  return { ...el.textStyle, align, bold };
}

export function getCellTextStyle(el: TableElement, row: number, column: number): TextStyle {
  if (row === TITLE_ROW) return getTitleTextStyle(el);
  const origin = resolveCell(el, { row, column });
  const base = getBaseCellTextStyle(el, origin.row, origin.column);
  const own = el.cells[origin.row][origin.column].textStyle;
  return own ? { ...base, ...own } : base;
}

function pickCellText(patch: Partial<TextStyle>): CellTextStyle {
  const picked: Record<string, unknown> = {};
  for (const key of CELL_TEXT_KEYS) if (key in patch) picked[key] = patch[key];
  return picked as CellTextStyle;
}

function withCellTextStyle(cell: TableCell, textStyle: CellTextStyle): TableCell {
  const next = { ...cell };
  delete next.textStyle;
  return Object.keys(textStyle).length > 0 ? { ...next, textStyle } : next;
}

export function hasCellTextPatch(patch: Partial<TextStyle>): boolean {
  return Object.keys(pickCellText(patch)).length > 0;
}

const DEFAULT_FALSY: Partial<Record<keyof TextStyle, unknown>> = { underline: false };

export function setCellsTextStyle(el: TableElement, range: CellRange, patch: Partial<TextStyle>): TableElement {
  const picked = pickCellText(patch);
  if (Object.keys(picked).length === 0) return el;
  const coverage = getCoverage(el);
  let changed = false;
  const cells = el.cells.map((row, r) =>
    row.map((cell, c) => {
      if (r < range.top || r > range.bottom || c < range.left || c > range.right || !isOrigin(coverage, r, c)) return cell;
      const base = getBaseCellTextStyle(el, r, c);
      const merged: Record<string, unknown> = { ...cell.textStyle, ...picked };
      for (const key of CELL_TEXT_KEYS) {
        if (key in merged && (merged[key] ?? DEFAULT_FALSY[key]) === (base[key] ?? DEFAULT_FALSY[key])) delete merged[key];
      }
      const next = withCellTextStyle(cell, merged as CellTextStyle);
      if (JSON.stringify(next.textStyle ?? {}) !== JSON.stringify(cell.textStyle ?? {})) changed = true;
      return next;
    }),
  );
  return changed ? fitTable({ ...el, cells }) : el;
}

export function clearCellTextStyles(el: TableElement, patch: Partial<TextStyle>): TableElement {
  const keys = Object.keys(pickCellText(patch)) as (keyof CellTextStyle)[];
  if (keys.length === 0 || !el.cells.some((row) => row.some((cell) => cell.textStyle))) return el;
  const cells = el.cells.map((row) =>
    row.map((cell) => {
      if (!cell.textStyle || !keys.some((key) => key in cell.textStyle!)) return cell;
      const textStyle = { ...cell.textStyle };
      for (const key of keys) delete textStyle[key];
      return withCellTextStyle(cell, textStyle);
    }),
  );
  return { ...el, cells };
}

export function getCellTarget(
  el: TableElement,
  cursor: CellPosition,
  extent?: CellPosition,
): { cell: CellPosition; range: CellRange } | null {
  const cell = clampCell(el, cursor);
  const end = extent ? clampCell(el, extent) : cell;
  if (isTitleCell(cell) || isTitleCell(end)) return null;
  return { cell, range: getMergeRange(el, cell, end) };
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

function spanWidth(el: TableElement, column: number, colSpan: number): number {
  return sum(el.columns.slice(column, column + colSpan));
}

function minRowHeights(el: TableElement): number[] {
  const coverage = getCoverage(el);
  const empty = cellMinHeight({ text: "" }, el.textStyle, 1);
  const mins = el.cells.map(() => empty);
  const tall: { row: number; rowSpan: number; height: number }[] = [];
  el.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (!isOrigin(coverage, r, c)) return;
      const height = cellMinHeight(cell, getCellTextStyle(el, r, c), spanWidth(el, c, getColSpan(cell)));
      const rowSpan = getRowSpan(cell);
      if (rowSpan === 1) mins[r] = Math.max(mins[r], height);
      else tall.push({ row: r, rowSpan, height });
    }),
  );
  tall.sort((a, b) => a.rowSpan - b.rowSpan);
  for (const { row, rowSpan, height } of tall) {
    const missing = height - sum(mins.slice(row, row + rowSpan));
    if (missing <= 0) continue;
    for (let i = row; i < row + rowSpan; i++) mins[i] += missing / rowSpan;
  }
  return mins;
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

export function getCellRect(el: TableElement, position: CellPosition): Bounds {
  if (position.row === TITLE_ROW) return { x: el.x, y: el.y, width: el.width, height: getTitleHeight(el) };
  const { row, column } = resolveCell(el, position);
  const cell = el.cells[row][column];
  return getRangeRect(el, {
    top: row,
    left: column,
    bottom: row + getRowSpan(cell) - 1,
    right: column + getColSpan(cell) - 1,
  });
}

export function getRangeRect(el: TableElement, range: CellRange): Bounds {
  const heights = getRowHeights(el);
  const tops = offsets(heights, getDataTop(el));
  return {
    x: getColumnLefts(el)[range.left],
    y: tops[range.top],
    width: spanWidth(el, range.left, range.right - range.left + 1),
    height: sum(heights.slice(range.top, range.bottom + 1)),
  };
}

function rangeOf(a: CellPosition, b: CellPosition): CellRange {
  return {
    top: Math.min(a.row, b.row),
    left: Math.min(a.column, b.column),
    bottom: Math.max(a.row, b.row),
    right: Math.max(a.column, b.column),
  };
}

export function getMergeRange(el: TableElement, a: CellPosition, b: CellPosition): CellRange {
  const range = rangeOf({ row: Math.max(a.row, 0), column: a.column }, { row: Math.max(b.row, 0), column: b.column });
  let grown = true;
  while (grown) {
    grown = false;
    for (let r = range.top; r <= range.bottom; r++) {
      for (let c = range.left; c <= range.right; c++) {
        const origin = resolveCell(el, { row: r, column: c });
        const cell = el.cells[origin.row][origin.column];
        const next = {
          top: Math.min(range.top, origin.row),
          left: Math.min(range.left, origin.column),
          bottom: Math.max(range.bottom, origin.row + getRowSpan(cell) - 1),
          right: Math.max(range.right, origin.column + getColSpan(cell) - 1),
        };
        if (next.top !== range.top || next.left !== range.left || next.bottom !== range.bottom || next.right !== range.right) {
          Object.assign(range, next);
          grown = true;
        }
      }
    }
  }
  return range;
}

export function canMergeRange(el: TableElement, range: CellRange): boolean {
  if (range.top === range.bottom && range.left === range.right) return false;
  const origin = el.cells[range.top][range.left];
  return !(range.bottom - range.top + 1 === getRowSpan(origin) && range.right - range.left + 1 === getColSpan(origin));
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
  return resolveCell(el, {
    row: indexAt(offsets(heights, top), heights, localPoint.y),
    column: indexAt(getColumnLefts(el), el.columns, localPoint.x),
  });
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

function mapCell(el: TableElement, position: CellPosition, update: (cell: TableCell) => TableCell): TableCell[][] {
  const target = resolveCell(el, position);
  return el.cells.map((row, r) =>
    r === target.row ? row.map((cell, c) => (c === target.column ? update(cell) : cell)) : row,
  );
}

function withSpans(cell: TableCell, rowSpan: number, colSpan: number): TableCell {
  const next: TableCell = { ...cell };
  delete next.rowSpan;
  delete next.colSpan;
  if (rowSpan > 1) next.rowSpan = rowSpan;
  if (colSpan > 1) next.colSpan = colSpan;
  return next;
}

export function mergeRange(el: TableElement, range: CellRange): TableElement {
  if (!canMergeRange(el, range)) return el;
  const coverage = getCoverage(el);
  const texts: string[] = [];
  for (let r = range.top; r <= range.bottom; r++) {
    for (let c = range.left; c <= range.right; c++) {
      const text = el.cells[r][c].text;
      if (isOrigin(coverage, r, c) && text.trim() !== "") texts.push(text);
    }
  }
  const cells = el.cells.map((row, r) =>
    row.map((cell, c) => {
      if (r < range.top || r > range.bottom || c < range.left || c > range.right) return cell;
      if (r !== range.top || c !== range.left) return { text: "" };
      const merged = { ...cell, text: texts.join("\n") };
      return withSpans(merged, range.bottom - range.top + 1, range.right - range.left + 1);
    }),
  );
  return fitTable({ ...el, cells });
}

export function unmergeCell(el: TableElement, position: CellPosition): TableElement {
  if (!isMergedCell(el, position)) return el;
  return fitTable({ ...el, cells: mapCell(el, position, (cell) => withSpans(cell, 1, 1)) });
}

export function getNextCell(el: TableElement, cell: CellPosition, backwards: boolean): CellPosition | null {
  if (isTitleCell(cell)) return backwards ? null : resolveCell(el, { row: 0, column: 0 });
  const columns = el.columns.length;
  const coverage = getCoverage(el);
  let index = cell.row * columns + cell.column;
  for (;;) {
    index += backwards ? -1 : 1;
    if (index < 0) return hasTitle(el) ? { row: TITLE_ROW, column: 0 } : null;
    const target = { row: Math.floor(index / columns), column: index % columns };
    if (target.row >= el.cells.length || isOrigin(coverage, target.row, target.column)) return target;
  }
}

export function setCellText(el: TableElement, position: CellPosition, text: string): TableElement {
  const cell = resolveCell(el, position);
  if (isTitleCell(cell)) return el.title === undefined || el.title === text ? el : fitTable({ ...el, title: text });
  if (el.cells[cell.row]?.[cell.column]?.text === text) return el;
  return fitTable({ ...el, cells: mapCell(el, cell, (current) => ({ ...current, text })) });
}

export function setCellFill(el: TableElement, position: CellPosition, fill: string | undefined): TableElement {
  const cell = resolveCell(el, position);
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

function growSpans(el: TableElement, index: number, axis: "row" | "column"): TableCell[][] {
  return el.cells.map((row, r) =>
    row.map((cell, c) => {
      const start = axis === "row" ? r : c;
      const span = axis === "row" ? getRowSpan(cell) : getColSpan(cell);
      if (!(start < index && index < start + span)) return cell;
      return axis === "row" ? withSpans(cell, span + 1, getColSpan(cell)) : withSpans(cell, getRowSpan(cell), span + 1);
    }),
  );
}

function shrinkSpans(el: TableElement, index: number, axis: "row" | "column"): TableCell[][] {
  const cells = el.cells.map((row) => [...row]);
  el.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const start = axis === "row" ? r : c;
      const span = axis === "row" ? getRowSpan(cell) : getColSpan(cell);
      if (span === 1 || index < start || index >= start + span) return;
      const shrunk = axis === "row" ? withSpans(cell, span - 1, getColSpan(cell)) : withSpans(cell, getRowSpan(cell), span - 1);
      if (start !== index) cells[r][c] = shrunk;
      else if (axis === "row") cells[r + 1][c] = shrunk;
      else cells[r][c + 1] = shrunk;
    }),
  );
  return cells;
}

export function insertRow(el: TableElement, index: number): TableElement {
  const grown = growSpans(el, index, "row");
  const cells = [...grown.slice(0, index), emptyRow(el.columns.length), ...grown.slice(index)];
  const next = { ...el, cells };
  const added = minRowHeights(next)[index];
  return fitTable(withSize(next, el.width, el.height + added));
}

export function deleteRow(el: TableElement, index: number): TableElement {
  if (el.cells.length <= 1) return el;
  const removed = getRowHeights(el)[index];
  const cells = shrinkSpans(el, index, "row").filter((_, r) => r !== index);
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
  const cells = growSpans(el, index, "column").map((row) => [...row.slice(0, index), { text: "" }, ...row.slice(index)]);
  const aligns = el.columnAligns && [...el.columnAligns.slice(0, index), null, ...el.columnAligns.slice(index)];
  return fitTable(withColumnAligns({ ...el, columns, cells }, aligns));
}

export function deleteColumn(el: TableElement, index: number): TableElement {
  if (el.columns.length <= 1) return el;
  const columns = el.columns.filter((_, c) => c !== index);
  const cells = shrinkSpans(el, index, "column").map((row) => row.filter((_, c) => c !== index));
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
  const title = { row: TITLE_ROW, column: 0 };
  if (el.title && !sameCell(hidden, title)) {
    const style = getTitleTextStyle(el);
    drawCellText(ctx, el.title, style, resolveTextColor(style, el), getCellRect(el, title));
  }
  const coverage = getCoverage(el);
  el.cells.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell.text === "" || !isOrigin(coverage, r, c) || sameCell(hidden, { row: r, column: c })) return;
      const rect = {
        x: lefts[c],
        y: tops[r],
        width: spanWidth(el, c, getColSpan(cell)),
        height: sum(heights.slice(r, r + getRowSpan(cell))),
      };
      const style = getCellTextStyle(el, r, c);
      drawCellText(ctx, cell.text, style, resolveTextColor(style, el), rect);
    });
  });
}

function openRuns(count: number, isOpen: (index: number) => boolean): [number, number][] {
  const runs: [number, number][] = [];
  let start = -1;
  for (let i = 0; i <= count; i++) {
    if (i < count && isOpen(i)) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      runs.push([start, i - 1]);
      start = -1;
    }
  }
  return runs;
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
    const coverage = getCoverage(el);
    el.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!isOrigin(coverage, r, c)) return;
        const style = { ...el.style, fillColor: getCellFill(el, { row: r, column: c }) };
        const width = spanWidth(el, c, getColSpan(cell));
        const height = sum(heights.slice(r, r + getRowSpan(cell)));
        drawFill(ctx, style, el.seed + r * columnCount + c, (options) =>
          rc.rectangle(lefts[c], tops[r], width, height, options),
        );
      }),
    );
    rc.rectangle(el.x, el.y, el.width, el.height, strokeOptions(el.style, el.seed));
    let seed = el.seed + 1;
    if (hasTitle(el)) rc.line(el.x, dataTop, el.x + el.width, dataTop, strokeOptions(el.style, seed++));
    for (let r = 1; r < heights.length; r++) {
      for (const [from, to] of openRuns(columnCount, (c) => coverage[r][c].row === r)) {
        const right = lefts[to] + el.columns[to];
        rc.line(lefts[from], tops[r], right, tops[r], strokeOptions(el.style, seed++));
      }
    }
    for (let c = 1; c < columnCount; c++) {
      for (const [from, to] of openRuns(heights.length, (r) => coverage[r][c].column === c)) {
        rc.line(lefts[c], tops[from], lefts[c], tops[to] + heights[to], strokeOptions(el.style, seed++));
      }
    }
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
