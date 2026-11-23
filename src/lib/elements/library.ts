import { nanoid } from "nanoid";
import type { Point } from "../types";
import type { Bounds } from "../geometry/bounds";
import { createBoxElement } from "./registry";
import { createArrow } from "./shapes/arrow";
import { createShape } from "./shapes/shape";
import { createCompartments } from "./shapes/compartments";
import { createText } from "./shapes/text";
import { createTable } from "./shapes/table";
import { laneHorizontalBand } from "./shapes/shapeKinds";
import { lightTheme } from "../theme";
import type { Messages } from "../../i18n/messages";
import type {
  ArrowheadPair,
  BoardElement,
  BoxElementType,
  ElementStyle,
  LabeledElement,
  ShapeKind,
  TextAlign,
  TextStyle,
  VerticalAlign,
} from "./types";

export type LibraryContent = Messages["content"];

type ContentKey<T> = { [K in keyof LibraryContent]: LibraryContent[K] extends T ? K : never }[keyof LibraryContent];

export const LIBRARY_GROUP_IDS = [
  "basic",
  "annotations",
  "containers",
  "flowchart",
  "er",
  "uml",
  "umlBehavior",
  "bpmn",
  "architecture",
  "wireframe",
] as const;

export type LibraryGroupId = (typeof LIBRARY_GROUP_IDS)[number];

interface LibraryItemDefinition {
  id: string;
  group: LibraryGroupId;
  width: number;
  height: number;
  create(bounds: Bounds, textStyle: TextStyle, content: LibraryContent): LibraryPart[];
}

export interface LibraryPart {
  element: BoardElement;
  style?: Partial<ElementStyle>;
}

export interface LibraryItemTexts {
  name: string;
  keywords: readonly string[];
}

interface LabelOptions {
  text: ContentKey<string>;
  align?: TextAlign;
  verticalAlign?: VerticalAlign;
  underline?: boolean;
}

function withLabel<T extends LabeledElement>(element: T, textStyle: TextStyle, text: string, label: Omit<LabelOptions, "text"> = {}): T {
  const { align = "center", verticalAlign = "middle", underline = textStyle.underline } = label;
  return { ...element, label: { text, textStyle: { ...textStyle, align, verticalAlign, underline } } };
}

function withContentLabel<T extends LabeledElement>(element: T, textStyle: TextStyle, content: LibraryContent, label?: LabelOptions): T {
  return label ? withLabel(element, textStyle, content[label.text], label) : element;
}

function createBox(type: BoxElementType, bounds: Bounds) {
  return createBoxElement(type, { x: bounds.x, y: bounds.y }, { x: bounds.x + bounds.width, y: bounds.y + bounds.height });
}

function box(type: BoxElementType, options: { label?: LabelOptions; style?: Partial<ElementStyle> } = {}) {
  return (bounds: Bounds, textStyle: TextStyle, content: LibraryContent): LibraryPart[] => {
    const element = withContentLabel(createBox(type, bounds), textStyle, content, options.label);
    return [{ element, style: options.style }];
  };
}

function shape(kind: ShapeKind, label?: LabelOptions, style?: Partial<ElementStyle>) {
  return (bounds: Bounds, textStyle: TextStyle, content: LibraryContent): LibraryPart[] => [
    { element: withContentLabel(createShape(kind, bounds), textStyle, content, label), style },
  ];
}

function compartments(sections: ContentKey<readonly string[]>) {
  return (bounds: Bounds, textStyle: TextStyle, content: LibraryContent): LibraryPart[] => [
    { element: createCompartments(bounds, [...content[sections]], textStyle) },
  ];
}

const PARTICIPANT_HEIGHT = 50;

function participant(bounds: Bounds, textStyle: TextStyle, content: LibraryContent): LibraryPart[] {
  const head = createBox("rectangle", { ...bounds, height: PARTICIPANT_HEIGHT });
  const cx = bounds.x + bounds.width / 2;
  const lifeline = createArrow(
    { x: cx, y: bounds.y + PARTICIPANT_HEIGHT },
    { x: cx, y: bounds.y + bounds.height },
    "straight",
    { start: "none", end: "none" },
  );
  return [
    { element: withLabel(head, textStyle, content.object) },
    { element: lifeline, style: { strokeStyle: "dashed" } },
  ];
}

const POOL_LANES = 2;

function pool(bounds: Bounds, textStyle: TextStyle, content: LibraryContent): LibraryPart[] {
  const band = laneHorizontalBand(bounds).width;
  const laneHeight = bounds.height / POOL_LANES;
  const lanes = Array.from({ length: POOL_LANES }, (_, i) => {
    const lane = createShape("laneHorizontal", {
      x: bounds.x + band,
      y: bounds.y + laneHeight * i,
      width: bounds.width - band,
      height: laneHeight,
    });
    return { element: withLabel(lane, textStyle, content.numberedLane(i + 1)) };
  });
  return [{ element: withLabel(createShape("pool", bounds), textStyle, content.pool) }, ...lanes];
}

function flow(arrowheads: ArrowheadPair, style: Partial<ElementStyle>) {
  return (bounds: Bounds): LibraryPart[] => {
    const y = bounds.y + bounds.height / 2;
    const arrow = createArrow({ x: bounds.x, y }, { x: bounds.x + bounds.width, y }, "straight", arrowheads);
    return [{ element: arrow, style }];
  };
}

const CHECKBOX_SIZE = 20;
const CHECKBOX_GAP = 10;

function checkbox(bounds: Bounds, textStyle: TextStyle, content: LibraryContent): LibraryPart[] {
  const cy = bounds.y + bounds.height / 2;
  const box = createShape("checkbox", { x: bounds.x, y: cy - CHECKBOX_SIZE / 2, width: CHECKBOX_SIZE, height: CHECKBOX_SIZE });
  const text = createText({ x: bounds.x + CHECKBOX_SIZE + CHECKBOX_GAP, y: cy }, textStyle, content.option);
  return [{ element: box }, { element: { ...text, y: cy - text.height / 2 } }];
}

const CARD_PADDING = 14;
const CARD_IMAGE_SHARE = 0.5;
const CARD_TEXT_GAP = 6;

function card(bounds: Bounds, textStyle: TextStyle, content: LibraryContent): LibraryPart[] {
  const frame = createBox("rectangle", bounds);
  const image = createShape("imagePlaceholder", {
    x: bounds.x + CARD_PADDING,
    y: bounds.y + CARD_PADDING,
    width: bounds.width - CARD_PADDING * 2,
    height: bounds.height * CARD_IMAGE_SHARE,
  });
  const left = bounds.x + CARD_PADDING;
  const title = createText({ x: left, y: image.y + image.height + CARD_PADDING }, { ...textStyle, bold: true }, content.cardTitle);
  const description = createText(
    { x: left, y: title.y + title.height + CARD_TEXT_GAP },
    { ...textStyle, bold: false, fontSize: Math.round(textStyle.fontSize * 0.75) },
    content.cardDescription,
  );
  return [
    { element: frame, style: { corners: "round" } },
    { element: image },
    { element: title },
    { element: description },
  ];
}

const TABLE_COLUMNS = 3;
const TABLE_BODY_ROWS = 2;

const ENTITY_COLUMNS = [50, 85, 105];

function entity(bounds: Bounds, textStyle: TextStyle, content: LibraryContent): LibraryPart[] {
  const scale = bounds.width / ENTITY_COLUMNS.reduce((total, width) => total + width, 0);
  const rows = content.entityRows.map((row) => [...row]);
  const element = createTable(bounds, rows, { ...textStyle, verticalAlign: "middle" }, {
    columns: ENTITY_COLUMNS.map((width) => width * scale),
    title: content.entity,
    headerRow: false,
  });
  return [{ element, style: { fillStyle: "solid" } }];
}

function table(bounds: Bounds, textStyle: TextStyle, content: LibraryContent): LibraryPart[] {
  const header = Array.from({ length: TABLE_COLUMNS }, (_, i) => content.tableColumn(i + 1));
  const body = Array.from({ length: TABLE_BODY_ROWS }, () => Array.from({ length: TABLE_COLUMNS }, () => ""));
  const element = createTable(bounds, [header, ...body], { ...textStyle, verticalAlign: "middle" });
  return [{ element, style: { fillStyle: "solid" } }];
}

const LIBRARY_ITEM_DEFINITIONS = [
  {
    id: "basic.triangle",
    group: "basic",
    width: 120,
    height: 100,
    create: shape("triangle"),
  },
  {
    id: "basic.pentagon",
    group: "basic",
    width: 120,
    height: 115,
    create: shape("pentagon"),
  },
  {
    id: "basic.hexagon",
    group: "basic",
    width: 140,
    height: 100,
    create: shape("hexagon"),
  },
  {
    id: "basic.octagon",
    group: "basic",
    width: 110,
    height: 110,
    create: shape("octagon"),
  },
  {
    id: "basic.trapezoid",
    group: "basic",
    width: 150,
    height: 90,
    create: shape("trapezoid"),
  },
  {
    id: "basic.star",
    group: "basic",
    width: 120,
    height: 115,
    create: shape("star"),
  },
  {
    id: "basic.cross",
    group: "basic",
    width: 100,
    height: 100,
    create: shape("cross"),
  },
  {
    id: "basic.blockArrow",
    group: "basic",
    width: 160,
    height: 80,
    create: shape("blockArrow"),
  },
  {
    id: "basic.doubleBlockArrow",
    group: "basic",
    width: 180,
    height: 80,
    create: shape("doubleBlockArrow"),
  },
  {
    id: "basic.cube",
    group: "basic",
    width: 120,
    height: 110,
    create: shape("cube"),
  },
  {
    id: "basic.table",
    group: "basic",
    width: 360,
    height: 120,
    create: table,
  },
  {
    id: "annotations.speechBubble",
    group: "annotations",
    width: 180,
    height: 110,
    create: shape("speechBubble"),
  },
  {
    id: "annotations.cloud",
    group: "annotations",
    width: 180,
    height: 110,
    create: shape("cloud"),
  },
  {
    id: "annotations.thoughtBubble",
    group: "annotations",
    width: 180,
    height: 140,
    create: shape("thoughtBubble"),
  },
  {
    id: "annotations.stickyNote",
    group: "annotations",
    width: 150,
    height: 150,
    create: shape("note", undefined, { fillColor: lightTheme.palette.amberLight, fillStyle: "solid" }),
  },
  {
    id: "annotations.brace",
    group: "annotations",
    width: 30,
    height: 150,
    create: shape("brace"),
  },
  {
    id: "containers.laneHorizontal",
    group: "containers",
    width: 520,
    height: 160,
    create: shape("laneHorizontal", { text: "lane" }),
  },
  {
    id: "containers.laneVertical",
    group: "containers",
    width: 200,
    height: 420,
    create: shape("laneVertical", { text: "lane" }),
  },
  {
    id: "containers.titledGroup",
    group: "containers",
    width: 340,
    height: 240,
    create: shape("titledGroup", { text: "group", align: "left" }, { strokeStyle: "dashed" }),
  },
  {
    id: "flowchart.process",
    group: "flowchart",
    width: 160,
    height: 80,
    create: box("rectangle"),
  },
  {
    id: "flowchart.decision",
    group: "flowchart",
    width: 160,
    height: 100,
    create: box("diamond"),
  },
  {
    id: "flowchart.terminal",
    group: "flowchart",
    width: 160,
    height: 60,
    create: shape("terminal"),
  },
  {
    id: "flowchart.io",
    group: "flowchart",
    width: 160,
    height: 80,
    create: shape("parallelogram"),
  },
  {
    id: "flowchart.document",
    group: "flowchart",
    width: 160,
    height: 90,
    create: shape("document"),
  },
  {
    id: "flowchart.database",
    group: "flowchart",
    width: 110,
    height: 120,
    create: shape("cylinder"),
  },
  {
    id: "flowchart.subprocess",
    group: "flowchart",
    width: 160,
    height: 80,
    create: shape("subprocess"),
  },
  {
    id: "flowchart.connector",
    group: "flowchart",
    width: 40,
    height: 40,
    create: box("ellipse"),
  },
  {
    id: "flowchart.note",
    group: "flowchart",
    width: 140,
    height: 100,
    create: shape("note"),
  },
  {
    id: "flowchart.preparation",
    group: "flowchart",
    width: 160,
    height: 80,
    create: shape("hexagon"),
  },
  {
    id: "flowchart.multiDocument",
    group: "flowchart",
    width: 170,
    height: 100,
    create: shape("multiDocument"),
  },
  {
    id: "flowchart.delay",
    group: "flowchart",
    width: 140,
    height: 80,
    create: shape("delay"),
  },
  {
    id: "flowchart.manualInput",
    group: "flowchart",
    width: 160,
    height: 80,
    create: shape("manualInput"),
  },
  {
    id: "flowchart.offPageConnector",
    group: "flowchart",
    width: 60,
    height: 60,
    create: shape("offPageConnector"),
  },
  {
    id: "flowchart.display",
    group: "flowchart",
    width: 160,
    height: 80,
    create: shape("display"),
  },
  {
    id: "er.entity",
    group: "er",
    width: 240,
    height: 110,
    create: entity,
  },
  {
    id: "er.weakEntity",
    group: "er",
    width: 160,
    height: 70,
    create: shape("weakEntity"),
  },
  {
    id: "er.relationship",
    group: "er",
    width: 150,
    height: 90,
    create: box("diamond"),
  },
  {
    id: "er.identifyingRelationship",
    group: "er",
    width: 150,
    height: 90,
    create: shape("doubleDiamond"),
  },
  {
    id: "er.attribute",
    group: "er",
    width: 130,
    height: 60,
    create: box("ellipse"),
  },
  {
    id: "er.keyAttribute",
    group: "er",
    width: 130,
    height: 60,
    create: box("ellipse", { label: { text: "keyAttribute", underline: true } }),
  },
  {
    id: "er.multivaluedAttribute",
    group: "er",
    width: 130,
    height: 60,
    create: shape("doubleEllipse"),
  },
  {
    id: "er.derivedAttribute",
    group: "er",
    width: 130,
    height: 60,
    create: box("ellipse", { style: { strokeStyle: "dashed" } }),
  },
  {
    id: "uml.class",
    group: "uml",
    width: 220,
    height: 150,
    create: compartments("classSections"),
  },
  {
    id: "uml.interface",
    group: "uml",
    width: 220,
    height: 110,
    create: compartments("interfaceSections"),
  },
  {
    id: "uml.actor",
    group: "uml",
    width: 80,
    height: 130,
    create: shape("actor", { text: "actor" }),
  },
  {
    id: "uml.useCase",
    group: "uml",
    width: 170,
    height: 80,
    create: box("ellipse"),
  },
  {
    id: "uml.system",
    group: "uml",
    width: 320,
    height: 360,
    create: box("rectangle", { label: { text: "system", verticalAlign: "top" } }),
  },
  {
    id: "uml.package",
    group: "uml",
    width: 180,
    height: 120,
    create: shape("package"),
  },
  {
    id: "uml.note",
    group: "uml",
    width: 160,
    height: 100,
    create: shape("note"),
  },
  {
    id: "uml.participant",
    group: "uml",
    width: 140,
    height: 320,
    create: participant,
  },
  {
    id: "uml.activation",
    group: "uml",
    width: 18,
    height: 90,
    create: box("rectangle", { style: { fillColor: lightTheme.palette.paper, fillStyle: "solid" } }),
  },
  {
    id: "uml.component",
    group: "uml",
    width: 180,
    height: 90,
    create: shape("component"),
  },
  {
    id: "uml.node",
    group: "uml",
    width: 160,
    height: 110,
    create: shape("cube"),
  },
  {
    id: "umlBehavior.state",
    group: "umlBehavior",
    width: 160,
    height: 70,
    create: box("rectangle", { style: { corners: "round" } }),
  },
  {
    id: "umlBehavior.initial",
    group: "umlBehavior",
    width: 30,
    height: 30,
    create: shape("initialState"),
  },
  {
    id: "umlBehavior.final",
    group: "umlBehavior",
    width: 36,
    height: 36,
    create: shape("finalState"),
  },
  {
    id: "umlBehavior.flowFinal",
    group: "umlBehavior",
    width: 32,
    height: 32,
    create: shape("flowFinal"),
  },
  {
    id: "umlBehavior.decision",
    group: "umlBehavior",
    width: 60,
    height: 60,
    create: box("diamond"),
  },
  {
    id: "umlBehavior.bar",
    group: "umlBehavior",
    width: 140,
    height: 8,
    create: shape("bar"),
  },
  {
    id: "bpmn.task",
    group: "bpmn",
    width: 140,
    height: 80,
    create: box("rectangle", { label: { text: "task" }, style: { corners: "round" } }),
  },
  {
    id: "bpmn.startEvent",
    group: "bpmn",
    width: 48,
    height: 48,
    create: box("ellipse"),
  },
  {
    id: "bpmn.intermediateEvent",
    group: "bpmn",
    width: 48,
    height: 48,
    create: shape("doubleEllipse"),
  },
  {
    id: "bpmn.endEvent",
    group: "bpmn",
    width: 48,
    height: 48,
    create: box("ellipse", { style: { strokeWidth: 4 } }),
  },
  {
    id: "bpmn.exclusiveGateway",
    group: "bpmn",
    width: 64,
    height: 64,
    create: shape("gatewayExclusive"),
  },
  {
    id: "bpmn.parallelGateway",
    group: "bpmn",
    width: 64,
    height: 64,
    create: shape("gatewayParallel"),
  },
  {
    id: "bpmn.inclusiveGateway",
    group: "bpmn",
    width: 64,
    height: 64,
    create: shape("gatewayInclusive"),
  },
  {
    id: "bpmn.pool",
    group: "bpmn",
    width: 640,
    height: 320,
    create: pool,
  },
  {
    id: "bpmn.dataObject",
    group: "bpmn",
    width: 60,
    height: 76,
    create: shape("note"),
  },
  {
    id: "bpmn.dataStore",
    group: "bpmn",
    width: 72,
    height: 72,
    create: shape("cylinder"),
  },
  {
    id: "bpmn.messageFlow",
    group: "bpmn",
    width: 180,
    height: 24,
    create: flow({ start: "circleOutline", end: "triangleOutline" }, { strokeStyle: "dashed" }),
  },
  {
    id: "bpmn.association",
    group: "bpmn",
    width: 180,
    height: 24,
    create: flow({ start: "none", end: "none" }, { strokeStyle: "dotted" }),
  },
  {
    id: "architecture.server",
    group: "architecture",
    width: 110,
    height: 120,
    create: shape("server", { text: "server" }),
  },
  {
    id: "architecture.queue",
    group: "architecture",
    width: 170,
    height: 70,
    create: shape("queue"),
  },
  {
    id: "architecture.monitor",
    group: "architecture",
    width: 140,
    height: 110,
    create: shape("monitor"),
  },
  {
    id: "architecture.mobile",
    group: "architecture",
    width: 70,
    height: 120,
    create: shape("mobile"),
  },
  {
    id: "architecture.person",
    group: "architecture",
    width: 110,
    height: 150,
    create: shape("person", { text: "person" }),
  },
  {
    id: "architecture.system",
    group: "architecture",
    width: 220,
    height: 110,
    create: box("rectangle", { label: { text: "softwareSystem" }, style: { corners: "round" } }),
  },
  {
    id: "wireframe.browser",
    group: "wireframe",
    width: 360,
    height: 240,
    create: shape("browserWindow"),
  },
  {
    id: "wireframe.button",
    group: "wireframe",
    width: 120,
    height: 44,
    create: box("rectangle", { label: { text: "button" }, style: { corners: "round" } }),
  },
  {
    id: "wireframe.textField",
    group: "wireframe",
    width: 220,
    height: 44,
    create: box("rectangle", { label: { text: "textField", align: "left" } }),
  },
  {
    id: "wireframe.checkbox",
    group: "wireframe",
    width: 140,
    height: 30,
    create: checkbox,
  },
  {
    id: "wireframe.phone",
    group: "wireframe",
    width: 200,
    height: 400,
    create: shape("mobile"),
  },
  {
    id: "wireframe.card",
    group: "wireframe",
    width: 220,
    height: 230,
    create: card,
  },
  {
    id: "wireframe.image",
    group: "wireframe",
    width: 160,
    height: 110,
    create: shape("imagePlaceholder"),
  },
] as const satisfies readonly LibraryItemDefinition[];

export type LibraryItemId = (typeof LIBRARY_ITEM_DEFINITIONS)[number]["id"];

export interface LibraryItem extends LibraryItemDefinition {
  id: LibraryItemId;
}

export const LIBRARY_ITEMS: readonly LibraryItem[] = LIBRARY_ITEM_DEFINITIONS;

export function centeredBounds(item: LibraryItem, center: Point): Bounds {
  return { x: center.x - item.width / 2, y: center.y - item.height / 2, width: item.width, height: item.height };
}

export function createLibraryElements(
  item: LibraryItem,
  bounds: Bounds,
  style: ElementStyle,
  textStyle: TextStyle,
  content: LibraryContent,
): BoardElement[] {
  const elements = item
    .create(bounds, textStyle, content)
    .map(({ element, style: patch }) => ({ ...element, style: { ...style, ...patch } }));
  if (elements.length < 2) return elements;
  const groupId = nanoid();
  return elements.map((el) => ({ ...el, groupIds: [...(el.groupIds ?? []), groupId] }));
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function matchesLibraryItem(texts: LibraryItemTexts, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const haystack = normalize([texts.name, ...texts.keywords].join(" "));
  return terms.every((term) => haystack.includes(term));
}

export function findLibraryItem(id: string): LibraryItem | undefined {
  return LIBRARY_ITEMS.find((item) => item.id === id);
}
