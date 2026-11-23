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
import type { LibraryGroupId, LibraryItemId, LibraryItemTexts } from "../lib/elements/library";

export type PaletteColor = keyof Theme["palette"];

export type HelpSectionId = "start" | "tools" | "diagrams" | "text" | "style" | "navigation" | "shortcuts";

export type ShortcutGroupId = "tools" | "editing" | "file" | "text" | "view" | "mouse";

export type MouseActionId =
  | "keepRatio"
  | "rotateSteps"
  | "arrowAngles"
  | "pan"
  | "panHorizontal"
  | "zoomAtCursor"
  | "writeText"
  | "insertShape"
  | "enterGroup"
  | "moveArrowLabel";

export const KEY_NAMES = [
  "Arrows",
  "Space",
  "drag",
  "rotate",
  "wheel",
  "middleButton",
  "pinch",
  "click",
  "doubleClick",
  "dragToBoard",
  "dragText",
] as const;

export type KeyName = (typeof KEY_NAMES)[number];

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
    sectionsLabel: string;
    or: string;
    sections: Record<HelpSectionId, string>;
    start: {
      steps: readonly string[];
      name: string;
      rename: string;
      menu: string;
      save: string;
      open: string;
      image: string;
    };
    diagrams: readonly string[];
    text: readonly string[];
    style: readonly string[];
    navigation: {
      pan: string;
      zoom: string;
      zoomButtons: string;
      grid: string;
      theme: string;
    };
    tools: Record<Tool, string>;
    groups: Record<ShortcutGroupId, string>;
    mouse: Record<MouseActionId, string>;
    keys: Record<KeyName, string>;
  };
  library: {
    panel: string;
    title: string;
    search: string;
    empty: string;
    hint: string;
    groups: Record<LibraryGroupId, string>;
    items: Record<LibraryItemId, LibraryItemTexts>;
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
  content: {
    untitledBoard: string;
    lane: string;
    numberedLane: (index: number) => string;
    pool: string;
    group: string;
    object: string;
    actor: string;
    system: string;
    classSections: readonly string[];
    interfaceSections: readonly string[];
    keyAttribute: string;
    entity: string;
    entityRows: readonly (readonly string[])[];
    tableColumn: (index: number) => string;
    tableTitle: string;
    task: string;
    server: string;
    person: string;
    softwareSystem: string;
    button: string;
    textField: string;
    option: string;
    cardTitle: string;
    cardDescription: string;
  };
}
