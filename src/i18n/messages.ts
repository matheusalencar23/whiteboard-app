import type { Tool } from "../store/whiteboardConfig";
import type { Theme } from "../lib/theme";
import type {
  ArrowRouting,
  Arrowhead,
  CornerStyle,
  FillStyle,
  FontFamily,
  StrokeStyle,
  TextAlign,
  VerticalAlign,
} from "../lib/elements/types";
import type { ShortcutId } from "../components/Board/shortcuts";

export type PaletteColor = keyof Theme["palette"];

export interface Messages {
  tools: Record<Tool, string>;
  shortcuts: Record<ShortcutId, string>;
  common: {
    close: string;
    dismissNotice: string;
    mixed: string;
  };
  toolbar: {
    label: string;
    library: string;
    gridDots: string;
    gridLines: string;
  };
  board: {
    menu: string;
    rename: string;
    name: string;
    renameHint: string;
    invalidFile: (fileName: string) => string;
    fileOpened: (boardName: string) => string;
  };
  zoom: {
    group: string;
    reset: string;
    current: (percent: number) => string;
  };
  theme: {
    menu: string;
    light: string;
    dark: string;
    system: string;
  };
  help: {
    button: string;
    title: string;
  };
  library: {
    panel: string;
    title: string;
    search: string;
    empty: string;
    hint: string;
  };
  export: {
    title: string;
    preview: string;
    content: string;
    all: string;
    selection: string;
    background: string;
    light: string;
    dark: string;
    transparent: string;
    scale: string;
    size: (width: number, height: number) => string;
    failed: string;
    copied: string;
    copyPng: string;
  };
  colors: Record<PaletteColor, string> & {
    none: string;
    autoText: string;
    noCellColor: string;
    custom: string;
    customValue: (value: string) => string;
    hex: string;
  };
  style: {
    bar: string;
    groups: {
      stroke: string;
      fill: string;
      table: string;
      pool: string;
      text: string;
      arrow: string;
      order: string;
    };
    color: string;
    opacity: string;
    roughness: string;
    roughnessLevels: { clean: string; sketch: string; rough: string };
    strokeWidth: string;
    strokeWidths: { thin: string; medium: string; thick: string };
    strokeStyle: string;
    strokeStyles: Record<StrokeStyle, string>;
    corners: string;
    cornerStyles: Record<CornerStyle, string>;
    fillStyle: string;
    fillStyles: Record<FillStyle, string>;
  };
  arrow: {
    routing: string;
    routings: Record<ArrowRouting, string>;
    arrowheads: string;
    swap: string;
    start: string;
    end: string;
    groups: { basic: string; uml: string; er: string };
    shapes: Record<Arrowhead, string>;
  };
  text: {
    scope: string;
    scopes: { table: string; cells: string };
    font: string;
    fonts: Record<FontFamily, string>;
    size: string;
    sizeInput: string;
    sizes: readonly string[];
    sizeBadges: readonly string[];
    style: string;
    color: string;
    align: string;
    aligns: Record<TextAlign, string>;
    verticalAligns: Record<VerticalAlign, string>;
  };
  table: {
    rows: string;
    insertRowAbove: string;
    insertRowBelow: string;
    deleteRow: string;
    columns: string;
    insertColumnLeft: string;
    insertColumnRight: string;
    deleteColumn: string;
    cells: string;
    merge: string;
    unmerge: string;
    header: string;
    title: string;
    headerRow: string;
    headerColor: string;
    body: string;
    bodyColor: string;
    selectedCell: string;
    cellColor: string;
  };
  pool: {
    lanes: string;
    insertLaneBelow: string;
    insertLaneAtEnd: string;
    deleteLane: string;
    deleteLastLane: string;
  };
  order: {
    title: string;
  };
}
