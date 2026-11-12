import { nanoid } from "nanoid";
import type { Point } from "../types";
import type { Bounds } from "../geometry/bounds";
import { createBoxElement } from "./registry";
import { createArrow } from "./shapes/arrow";
import { createShape } from "./shapes/shape";
import { createCompartments } from "./shapes/compartments";
import { theme } from "../theme";
import type {
  BoardElement,
  BoxElementType,
  ElementStyle,
  LabeledElement,
  ShapeKind,
  TextStyle,
  VerticalAlign,
} from "./types";

export interface LibraryGroup {
  id: string;
  name: string;
}

export interface LibraryItem {
  id: string;
  name: string;
  group: string;
  keywords: string[];
  width: number;
  height: number;
  create(bounds: Bounds, textStyle: TextStyle): LibraryPart[];
}

export interface LibraryPart {
  element: BoardElement;
  style?: Partial<ElementStyle>;
}

export const LIBRARY_GROUPS: LibraryGroup[] = [
  { id: "flowchart", name: "Fluxograma" },
  { id: "er", name: "Entidade-relacionamento" },
  { id: "uml", name: "UML" },
];

interface LabelOptions {
  text: string;
  verticalAlign?: VerticalAlign;
}

function withLabel<T extends LabeledElement>(element: T, textStyle: TextStyle, label?: LabelOptions): T {
  if (!label) return element;
  const { text, verticalAlign = "middle" } = label;
  return { ...element, label: { text, textStyle: { ...textStyle, align: "center", verticalAlign } } };
}

function createBox(type: BoxElementType, bounds: Bounds) {
  return createBoxElement(type, { x: bounds.x, y: bounds.y }, { x: bounds.x + bounds.width, y: bounds.y + bounds.height });
}

function box(type: BoxElementType, options: { label?: LabelOptions; style?: Partial<ElementStyle> } = {}) {
  return (bounds: Bounds, textStyle: TextStyle): LibraryPart[] => {
    const element = withLabel(createBox(type, bounds), textStyle, options.label);
    return [{ element, style: options.style }];
  };
}

function shape(kind: ShapeKind, label?: LabelOptions) {
  return (bounds: Bounds, textStyle: TextStyle): LibraryPart[] => [
    { element: withLabel(createShape(kind, bounds), textStyle, label) },
  ];
}

function compartments(texts: string[]) {
  return (bounds: Bounds, textStyle: TextStyle): LibraryPart[] => [{ element: createCompartments(bounds, texts, textStyle) }];
}

const PARTICIPANT_HEIGHT = 50;

function participant(bounds: Bounds, textStyle: TextStyle): LibraryPart[] {
  const head = createBox("rectangle", { ...bounds, height: PARTICIPANT_HEIGHT });
  const cx = bounds.x + bounds.width / 2;
  const lifeline = createArrow(
    { x: cx, y: bounds.y + PARTICIPANT_HEIGHT },
    { x: cx, y: bounds.y + bounds.height },
    "straight",
    { start: "none", end: "none" },
  );
  return [
    { element: withLabel(head, textStyle, { text: "Objeto" }) },
    { element: lifeline, style: { strokeStyle: "dashed" } },
  ];
}

export const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: "flowchart.process",
    name: "Processo",
    group: "flowchart",
    keywords: ["retângulo", "etapa", "ação", "passo"],
    width: 160,
    height: 80,
    create: box("rectangle"),
  },
  {
    id: "flowchart.decision",
    name: "Decisão",
    group: "flowchart",
    keywords: ["losango", "condição", "se", "pergunta"],
    width: 160,
    height: 100,
    create: box("diamond"),
  },
  {
    id: "flowchart.terminal",
    name: "Início / fim",
    group: "flowchart",
    keywords: ["terminal", "começo", "término", "arredondado", "pílula"],
    width: 160,
    height: 60,
    create: shape("terminal"),
  },
  {
    id: "flowchart.io",
    name: "Entrada / saída",
    group: "flowchart",
    keywords: ["paralelogramo", "dados", "leitura", "escrita"],
    width: 160,
    height: 80,
    create: shape("parallelogram"),
  },
  {
    id: "flowchart.document",
    name: "Documento",
    group: "flowchart",
    keywords: ["relatório", "papel", "arquivo"],
    width: 160,
    height: 90,
    create: shape("document"),
  },
  {
    id: "flowchart.database",
    name: "Banco de dados",
    group: "flowchart",
    keywords: ["cilindro", "armazenamento", "dados", "db"],
    width: 110,
    height: 120,
    create: shape("cylinder"),
  },
  {
    id: "flowchart.subprocess",
    name: "Subprocesso",
    group: "flowchart",
    keywords: ["processo predefinido", "sub-rotina", "função"],
    width: 160,
    height: 80,
    create: shape("subprocess"),
  },
  {
    id: "flowchart.connector",
    name: "Conector",
    group: "flowchart",
    keywords: ["círculo", "ligação", "referência"],
    width: 40,
    height: 40,
    create: box("ellipse"),
  },
  {
    id: "flowchart.note",
    name: "Nota",
    group: "flowchart",
    keywords: ["comentário", "anotação", "canto dobrado"],
    width: 140,
    height: 100,
    create: shape("note"),
  },
  {
    id: "er.entity",
    name: "Entidade",
    group: "er",
    keywords: ["tabela", "atributos", "chave", "pk", "fk", "compartimentos"],
    width: 200,
    height: 120,
    create: compartments(["Entidade", "PK  id\nnome"]),
  },
  {
    id: "er.weakEntity",
    name: "Entidade fraca",
    group: "er",
    keywords: ["retângulo duplo", "dependente"],
    width: 160,
    height: 70,
    create: shape("weakEntity"),
  },
  {
    id: "er.relationship",
    name: "Relacionamento",
    group: "er",
    keywords: ["losango", "associação"],
    width: 150,
    height: 90,
    create: box("diamond"),
  },
  {
    id: "er.identifyingRelationship",
    name: "Relacionamento identificador",
    group: "er",
    keywords: ["losango duplo", "entidade fraca"],
    width: 150,
    height: 90,
    create: shape("doubleDiamond"),
  },
  {
    id: "er.attribute",
    name: "Atributo",
    group: "er",
    keywords: ["elipse", "campo", "propriedade"],
    width: 130,
    height: 60,
    create: box("ellipse"),
  },
  {
    id: "er.multivaluedAttribute",
    name: "Atributo multivalorado",
    group: "er",
    keywords: ["elipse dupla", "lista", "vários valores"],
    width: 130,
    height: 60,
    create: shape("doubleEllipse"),
  },
  {
    id: "er.derivedAttribute",
    name: "Atributo derivado",
    group: "er",
    keywords: ["elipse tracejada", "calculado"],
    width: 130,
    height: 60,
    create: box("ellipse", { style: { strokeStyle: "dashed" } }),
  },
  {
    id: "uml.class",
    name: "Classe",
    group: "uml",
    keywords: ["atributos", "métodos", "compartimentos", "objeto"],
    width: 220,
    height: 150,
    create: compartments(["Classe", "+ atributo: Tipo", "+ método(): Tipo"]),
  },
  {
    id: "uml.interface",
    name: "Interface",
    group: "uml",
    keywords: ["contrato", "métodos", "abstrata"],
    width: 220,
    height: 110,
    create: compartments(["«interface»\nInterface", "+ método(): Tipo"]),
  },
  {
    id: "uml.actor",
    name: "Ator",
    group: "uml",
    keywords: ["boneco", "usuário", "pessoa", "caso de uso"],
    width: 80,
    height: 130,
    create: shape("actor", { text: "Ator" }),
  },
  {
    id: "uml.useCase",
    name: "Caso de uso",
    group: "uml",
    keywords: ["elipse", "funcionalidade", "requisito"],
    width: 170,
    height: 80,
    create: box("ellipse"),
  },
  {
    id: "uml.system",
    name: "Fronteira do sistema",
    group: "uml",
    keywords: ["sistema", "limite", "contêiner", "caso de uso"],
    width: 320,
    height: 360,
    create: box("rectangle", { label: { text: "Sistema", verticalAlign: "top" } }),
  },
  {
    id: "uml.package",
    name: "Pacote",
    group: "uml",
    keywords: ["pasta", "módulo", "namespace"],
    width: 180,
    height: 120,
    create: shape("package"),
  },
  {
    id: "uml.note",
    name: "Nota",
    group: "uml",
    keywords: ["comentário", "canto dobrado", "anotação"],
    width: 160,
    height: 100,
    create: shape("note"),
  },
  {
    id: "uml.participant",
    name: "Participante",
    group: "uml",
    keywords: ["sequência", "linha de vida", "objeto", "lifeline"],
    width: 140,
    height: 320,
    create: participant,
  },
  {
    id: "uml.activation",
    name: "Ativação",
    group: "uml",
    keywords: ["sequência", "execução", "foco de controle"],
    width: 18,
    height: 90,
    create: box("rectangle", { style: { fillColor: theme.palette.paper, fillStyle: "solid" } }),
  },
];

export function centeredBounds(item: LibraryItem, center: Point): Bounds {
  return { x: center.x - item.width / 2, y: center.y - item.height / 2, width: item.width, height: item.height };
}

export function createLibraryElements(
  item: LibraryItem,
  bounds: Bounds,
  style: ElementStyle,
  textStyle: TextStyle,
): BoardElement[] {
  const elements = item
    .create(bounds, textStyle)
    .map(({ element, style: patch }) => ({ ...element, style: { ...style, ...patch } }));
  if (elements.length < 2) return elements;
  const groupId = nanoid();
  return elements.map((el) => ({ ...el, groupIds: [...(el.groupIds ?? []), groupId] }));
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function matchesLibraryItem(item: LibraryItem, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const haystack = normalize([item.name, ...item.keywords].join(" "));
  return terms.every((term) => haystack.includes(term));
}

export function findLibraryItem(id: string): LibraryItem | undefined {
  return LIBRARY_ITEMS.find((item) => item.id === id);
}
