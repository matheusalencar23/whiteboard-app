import { useCallback, useEffect, useRef } from "react";
import {
  LuBetweenHorizontalEnd,
  LuBetweenHorizontalStart,
  LuBetweenVerticalEnd,
  LuBetweenVerticalStart,
  LuHeading,
  LuPanelTop,
  LuTableCellsMerge,
  LuTableCellsSplit,
  LuTableColumnsSplit,
  LuTableRowsSplit,
} from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import type { BoardElement, TableElement } from "../../../lib/elements/types";
import {
  clampCell,
  deleteColumn,
  deleteRow,
  insertColumn,
  insertRow,
  canMergeRange,
  getColumnAlign,
  getMergeRange,
  isMergedCell,
  mergeRange,
  unmergeCell,
  hasTitle,
  isTitleCell,
  setTitle,
  setCellFill,
  setColumnAlign,
  setHeaderFill,
  setHeaderRow,
  type CellPosition,
} from "../../../lib/elements/shapes/table";
import { remapTableRowBindings } from "../../../lib/elements/bindings";
import type { BoardStore } from "../../../store/boardStore";
import { useBoardStore, useBoardStoreApi } from "../../../store/boardStoreContext";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { PanelSection } from "../../../ui/Panel/Panel";
import { AUTO_COLOR, ColorField } from "./ColorField";
import { alignOptions } from "./alignOptions";
import { useMessages } from "../../../i18n/useMessages";
import { OptionGroup } from "./StyleControls";
import { selectSingleTable } from "./selectors";
import { useCellSwatches, useFillSwatches } from "./swatches";
import { useStylePreview } from "./useStylePreview";


type TableUpdate = (table: TableElement) => TableElement;

function findTable(boardStore: BoardStore, id: string): TableElement | null {
  const element = boardStore.getState().elements.find((el) => el.id === id);
  return element?.type === "table" ? element : null;
}

function useTablePreview(id: string) {
  const boardStore = useBoardStoreApi();
  const beforeRef = useRef<BoardElement[] | null>(null);

  const preview = useCallback(
    (update: TableUpdate) => {
      const table = findTable(boardStore, id);
      if (!table) return;
      if (!beforeRef.current) {
        beforeRef.current = boardStore.getState().elements;
        boardStore.getState().beginInteraction();
      }
      boardStore.getState().updateElements([update(table)]);
    },
    [boardStore, id],
  );

  const commit = useCallback(() => {
    const before = beforeRef.current;
    beforeRef.current = null;
    if (!before) return;
    boardStore.getState().commitHistory(before);
    boardStore.getState().endInteraction();
  }, [boardStore]);

  useEffect(() => commit, [commit]);

  return { preview, commit };
}

export function TableControls() {
  const table = useBoardStore(selectSingleTable);
  if (!table) return null;
  return <TableControlsContent table={table} />;
}

function TableControlsContent({ table }: { table: TableElement }) {
  const boardStore = useBoardStoreApi();
  const tableCell = useBoardStore((s) => s.tableCell);
  const { preview, commit } = useTablePreview(table.id);
  const fillSwatches = useFillSwatches();
  const cellSwatches = useCellSwatches();
  const messages = useMessages();
  const { preview: previewStyle, commit: commitStyle } = useStylePreview();
  const setStyle = useBoardStore((s) => s.setStyle);

  const cell = tableCell?.elementId === table.id ? clampCell(table, tableCell) : { row: 0, column: 0 };
  const onTitle = isTitleCell(cell);
  const extent = tableCell?.elementId === table.id && tableCell.extent ? clampCell(table, tableCell.extent) : null;
  const range = extent && !onTitle && !isTitleCell(extent) ? getMergeRange(table, cell, extent) : null;
  const cellFill = onTitle ? undefined : table.cells[cell.row][cell.column].fill;

  function apply(update: TableUpdate, nextCell: CellPosition = cell, mapRow?: (row: number) => number | undefined) {
    const store = boardStore.getState();
    const current = findTable(boardStore, table.id);
    if (!current) return;
    const updated = update(current);
    if (updated !== current) {
      const before = store.elements;
      const arrows = mapRow ? remapTableRowBindings(before, table.id, mapRow) : [];
      store.updateElements([updated, ...arrows]);
      store.commitHistory(before);
    }
    store.setTableCell({ elementId: table.id, ...clampCell(updated, nextCell) });
  }

  const shiftFrom = (index: number) => (row: number) => (row >= index ? row + 1 : row);
  const removeRow = (index: number) => (row: number) => (row === index ? undefined : row > index ? row - 1 : row);

  const toCellFill = (color: string) => (color === AUTO_COLOR ? undefined : color);

  return (
    <>
      <PanelSection title={messages.table.rows}>
        <div className={styles.options}>
          <IconButton
            icon={LuBetweenVerticalStart}
            label={messages.table.insertRowAbove}
            size="sm"
            tooltipSide="bottom"
            disabled={onTitle}
            onClick={() => apply((t) => insertRow(t, cell.row), cell, shiftFrom(cell.row))}
          />
          <IconButton
            icon={LuBetweenVerticalEnd}
            label={messages.table.insertRowBelow}
            size="sm"
            tooltipSide="bottom"
            onClick={() =>
              apply((t) => insertRow(t, cell.row + 1), { ...cell, row: cell.row + 1 }, shiftFrom(cell.row + 1))
            }
          />
          <IconButton
            icon={LuTableRowsSplit}
            label={messages.table.deleteRow}
            size="sm"
            tooltipSide="bottom"
            disabled={onTitle || table.cells.length <= 1}
            onClick={() => apply((t) => deleteRow(t, cell.row), cell, removeRow(cell.row))}
          />
        </div>
      </PanelSection>
      <PanelSection title={messages.table.columns}>
        <div className={styles.options}>
          <IconButton
            icon={LuBetweenHorizontalStart}
            label={messages.table.insertColumnLeft}
            size="sm"
            tooltipSide="bottom"
            disabled={onTitle}
            onClick={() => apply((t) => insertColumn(t, cell.column))}
          />
          <IconButton
            icon={LuBetweenHorizontalEnd}
            label={messages.table.insertColumnRight}
            size="sm"
            tooltipSide="bottom"
            disabled={onTitle}
            onClick={() => apply((t) => insertColumn(t, cell.column + 1), { ...cell, column: cell.column + 1 })}
          />
          <IconButton
            icon={LuTableColumnsSplit}
            label={messages.table.deleteColumn}
            size="sm"
            tooltipSide="bottom"
            disabled={onTitle || table.columns.length <= 1}
            onClick={() => apply((t) => deleteColumn(t, cell.column))}
          />
        </div>
        {!onTitle && (
          <OptionGroup
            options={alignOptions(messages)}
            value={getColumnAlign(table, cell.column)}
            onChange={(align) => apply((t) => setColumnAlign(t, cell.column, align))}
          />
        )}
      </PanelSection>
      <PanelSection title={messages.table.cells}>
        <div className={styles.options}>
          <IconButton
            icon={LuTableCellsMerge}
            label={messages.table.merge}
            size="sm"
            tooltipSide="bottom"
            disabled={!range || !canMergeRange(table, range)}
            onClick={() =>
              range && apply((t) => mergeRange(t, range), { row: range.top, column: range.left })
            }
          />
          <IconButton
            icon={LuTableCellsSplit}
            label={messages.table.unmerge}
            size="sm"
            tooltipSide="bottom"
            disabled={!isMergedCell(table, cell)}
            onClick={() => apply((t) => unmergeCell(t, cell))}
          />
        </div>
      </PanelSection>
      <PanelSection title={messages.table.header}>
        <div className={styles.options}>
          <IconButton
            icon={LuHeading}
            label={messages.table.title}
            size="sm"
            tooltipSide="bottom"
            active={hasTitle(table)}
            onClick={() => {
              const next = hasTitle(table) ? { row: 0, column: 0 } : cell;
              apply((t) => setTitle(t, hasTitle(t) ? undefined : messages.content.tableTitle), next);
            }}
          />
          <IconButton
            icon={LuPanelTop}
            label={messages.table.headerRow}
            size="sm"
            tooltipSide="bottom"
            active={table.headerRow}
            onClick={() => apply((t) => setHeaderRow(t, !t.headerRow))}
          />
        </div>
        {(table.headerRow || hasTitle(table)) && (
          <ColorField
            title={messages.table.headerColor}
            value={table.headerFill}
            swatches={fillSwatches}
            onChange={(color) => apply((t) => setHeaderFill(t, color))}
            onPreview={(color) => preview((t) => setHeaderFill(t, color))}
            onPreviewEnd={commit}
          />
        )}
      </PanelSection>
      <PanelSection title={messages.table.body}>
        <ColorField
          title={messages.table.bodyColor}
          value={table.style.fillColor}
          swatches={fillSwatches}
          onChange={(color) => setStyle({ fillColor: color })}
          onPreview={(color) => previewStyle({ fillColor: color })}
          onPreviewEnd={commitStyle}
        />
      </PanelSection>
      {!onTitle && (
        <PanelSection title={messages.table.selectedCell}>
          <ColorField
            title={messages.table.cellColor}
            value={cellFill ?? AUTO_COLOR}
            swatches={cellSwatches}
            onChange={(color) => apply((t) => setCellFill(t, cell, toCellFill(color)))}
            onPreview={(color) => preview((t) => setCellFill(t, cell, toCellFill(color)))}
            onPreviewEnd={commit}
          />
        </PanelSection>
      )}
    </>
  );
}
