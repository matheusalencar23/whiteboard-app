import { useCallback, useEffect, useRef } from "react";
import {
  LuBetweenHorizontalEnd,
  LuBetweenHorizontalStart,
  LuBetweenVerticalEnd,
  LuBetweenVerticalStart,
  LuHeading,
  LuPanelTop,
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
  TITLE_PLACEHOLDER,
  getColumnAlign,
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
import { useBoardStore } from "../../../store/boardStore";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { PanelSection } from "../../../ui/Panel/Panel";
import { AUTO_COLOR, ColorField, type Swatch } from "./ColorField";
import { ALIGN_OPTIONS } from "./alignOptions";
import { OptionGroup } from "./StyleControls";
import { selectSingleTable } from "./selectors";
import { FILL_SWATCHES } from "./swatches";
import { useStylePreview } from "./useStylePreview";

const CELL_SWATCHES: Swatch[] = [{ color: AUTO_COLOR, label: "Sem cor própria" }, ...FILL_SWATCHES];

type TableUpdate = (table: TableElement) => TableElement;

function findTable(id: string): TableElement | null {
  const element = useBoardStore.getState().elements.find((el) => el.id === id);
  return element?.type === "table" ? element : null;
}

function useTablePreview(id: string) {
  const beforeRef = useRef<BoardElement[] | null>(null);

  const preview = useCallback(
    (update: TableUpdate) => {
      const table = findTable(id);
      if (!table) return;
      beforeRef.current ??= useBoardStore.getState().elements;
      useBoardStore.getState().updateElements([update(table)]);
    },
    [id],
  );

  const commit = useCallback(() => {
    const before = beforeRef.current;
    beforeRef.current = null;
    if (before) useBoardStore.getState().commitHistory(before);
  }, []);

  useEffect(() => commit, [commit]);

  return { preview, commit };
}

export function TableControls() {
  const table = useBoardStore(selectSingleTable);
  if (!table) return null;
  return <TableControlsContent table={table} />;
}

function TableControlsContent({ table }: { table: TableElement }) {
  const tableCell = useBoardStore((s) => s.tableCell);
  const { preview, commit } = useTablePreview(table.id);
  const { preview: previewStyle, commit: commitStyle } = useStylePreview();
  const setStyle = useBoardStore((s) => s.setStyle);

  const cell = tableCell?.elementId === table.id ? clampCell(table, tableCell) : { row: 0, column: 0 };
  const onTitle = isTitleCell(cell);
  const cellFill = onTitle ? undefined : table.cells[cell.row][cell.column].fill;

  function apply(update: TableUpdate, nextCell: CellPosition = cell, mapRow?: (row: number) => number | undefined) {
    const store = useBoardStore.getState();
    const current = findTable(table.id);
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
      <PanelSection title="Linhas">
        <div className={styles.options}>
          <IconButton
            icon={LuBetweenVerticalStart}
            label="Inserir linha acima"
            size="sm"
            tooltipSide="bottom"
            disabled={onTitle}
            onClick={() => apply((t) => insertRow(t, cell.row), cell, shiftFrom(cell.row))}
          />
          <IconButton
            icon={LuBetweenVerticalEnd}
            label="Inserir linha abaixo"
            size="sm"
            tooltipSide="bottom"
            onClick={() =>
              apply((t) => insertRow(t, cell.row + 1), { ...cell, row: cell.row + 1 }, shiftFrom(cell.row + 1))
            }
          />
          <IconButton
            icon={LuTableRowsSplit}
            label="Apagar linha"
            size="sm"
            tooltipSide="bottom"
            disabled={onTitle || table.cells.length <= 1}
            onClick={() => apply((t) => deleteRow(t, cell.row), cell, removeRow(cell.row))}
          />
        </div>
      </PanelSection>
      <PanelSection title="Colunas">
        <div className={styles.options}>
          <IconButton
            icon={LuBetweenHorizontalStart}
            label="Inserir coluna à esquerda"
            size="sm"
            tooltipSide="bottom"
            disabled={onTitle}
            onClick={() => apply((t) => insertColumn(t, cell.column))}
          />
          <IconButton
            icon={LuBetweenHorizontalEnd}
            label="Inserir coluna à direita"
            size="sm"
            tooltipSide="bottom"
            disabled={onTitle}
            onClick={() => apply((t) => insertColumn(t, cell.column + 1), { ...cell, column: cell.column + 1 })}
          />
          <IconButton
            icon={LuTableColumnsSplit}
            label="Apagar coluna"
            size="sm"
            tooltipSide="bottom"
            disabled={onTitle || table.columns.length <= 1}
            onClick={() => apply((t) => deleteColumn(t, cell.column))}
          />
        </div>
        {!onTitle && (
          <OptionGroup
            options={ALIGN_OPTIONS}
            value={getColumnAlign(table, cell.column)}
            onChange={(align) => apply((t) => setColumnAlign(t, cell.column, align))}
          />
        )}
      </PanelSection>
      <PanelSection title="Cabeçalho">
        <div className={styles.options}>
          <IconButton
            icon={LuHeading}
            label="Título acima das colunas"
            size="sm"
            tooltipSide="bottom"
            active={hasTitle(table)}
            onClick={() => {
              const next = hasTitle(table) ? { row: 0, column: 0 } : cell;
              apply((t) => setTitle(t, hasTitle(t) ? undefined : TITLE_PLACEHOLDER), next);
            }}
          />
          <IconButton
            icon={LuPanelTop}
            label="Primeira linha como cabeçalho"
            size="sm"
            tooltipSide="bottom"
            active={table.headerRow}
            onClick={() => apply((t) => setHeaderRow(t, !t.headerRow))}
          />
        </div>
        {(table.headerRow || hasTitle(table)) && (
          <ColorField
            title="Cor do cabeçalho"
            value={table.headerFill}
            swatches={FILL_SWATCHES}
            onChange={(color) => apply((t) => setHeaderFill(t, color))}
            onPreview={(color) => preview((t) => setHeaderFill(t, color))}
            onPreviewEnd={commit}
          />
        )}
      </PanelSection>
      <PanelSection title="Corpo">
        <ColorField
          title="Cor do corpo"
          value={table.style.fillColor}
          swatches={FILL_SWATCHES}
          onChange={(color) => setStyle({ fillColor: color })}
          onPreview={(color) => previewStyle({ fillColor: color })}
          onPreviewEnd={commitStyle}
        />
      </PanelSection>
      {!onTitle && (
        <PanelSection title="Célula selecionada">
          <ColorField
            title="Cor da célula"
            value={cellFill ?? AUTO_COLOR}
            swatches={CELL_SWATCHES}
            onChange={(color) => apply((t) => setCellFill(t, cell, toCellFill(color)))}
            onPreview={(color) => preview((t) => setCellFill(t, cell, toCellFill(color)))}
            onPreviewEnd={commit}
          />
        </PanelSection>
      )}
    </>
  );
}
