import type { Point } from "../types";

export interface ElementStyle {
  strokeColor: string;
  /** "transparent" = sem preenchimento. */
  fillColor: string;
  strokeWidth: number;
  /** Intensidade do traço de esboço do roughjs (0 = traço limpo). */
  roughness: number;
}

/**
 * Campos comuns a todo elemento. Coordenadas sempre em espaço de mundo.
 * `x, y, width, height` são a caixa delimitadora, sempre normalizada
 * (largura e altura >= 0).
 */
interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Em radianos, em torno do centro do elemento. */
  rotation: number;
  style: ElementStyle;
  /**
   * Semente do roughjs. O roughjs sorteia o traço a cada desenho, então cada
   * elemento guarda a sua para não "tremer" quando a cena é redesenhada.
   */
  seed: number;
}

/** Texto centralizado dentro de uma forma de caixa, que quebra linha na largura dela. */
export interface ShapeLabel {
  text: string;
  fontSize: number;
}

/** Formas de caixa podem ter um rótulo, que se move e redimensiona junto. */
interface BoxBaseElement extends BaseElement {
  label?: ShapeLabel;
}

export interface RectangleElement extends BoxBaseElement {
  type: "rectangle";
}

export interface EllipseElement extends BoxBaseElement {
  type: "ellipse";
}

export interface DiamondElement extends BoxBaseElement {
  type: "diamond";
}

/**
 * Elementos feitos de pontos. Os `points` são relativos a (`x`, `y`), então
 * mover o elemento só muda `x` e `y`.
 */
/**
 * Tipo da seta:
 * - `straight`: linha reta entre os pontos, com quinas nos pontos do meio;
 * - `curved`: curva suave passando pelos pontos (com dois pontos, é uma reta);
 * - `elbow`: ortogonal, só horizontais e verticais, com a rota calculada a
 *   partir das pontas, como no draw.io.
 * Nas duas primeiras, os pontos do meio são do usuário (alça no meio de cada
 * trecho); na ortogonal, são calculados.
 */
export type ArrowRouting = "straight" | "elbow" | "curved";

export interface ArrowElement extends BaseElement {
  type: "arrow";
  /** Na reta e na curva, os pontos do meio são do usuário; na ortogonal, são calculados. */
  points: Point[];
  routing: ArrowRouting;
  /**
   * Só na ortogonal: trechos que o usuário arrastou, na ordem em que aparecem
   * na seta, relativos a (`x`, `y`) como os `points`. A rota automática liga
   * as pontas a eles, e eles ficam onde foram deixados. Ausente ou vazio =
   * rota toda automática.
   */
  fixedSegments?: ArrowSegment[];
  /** Forma a que a primeira ponta está ligada, se houver. */
  startBinding: ArrowBinding | null;
  /** Forma a que a última ponta está ligada, se houver. */
  endBinding: ArrowBinding | null;
}

/** Trecho reto entre dois pontos (horizontal ou vertical, na seta ortogonal). */
export interface ArrowSegment {
  start: Point;
  end: Point;
}

/** Ligação de uma ponta de seta a uma forma. */
export interface ArrowBinding {
  elementId: string;
  /**
   * Posição relativa na caixa da forma (0 a 1 em `x` e `y`), para continuar
   * certa quando a forma muda de tamanho. `null` = ligação flutuante: a seta
   * mira o centro da forma e para na borda.
   */
  anchor: Point | null;
}

export interface FreedrawElement extends BaseElement {
  type: "freedraw";
  points: Point[];
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
}

/** União de todos os tipos de elemento. Novas formas entram aqui. */
export type BoardElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | ArrowElement
  | FreedrawElement
  | TextElement;

export type ElementType = BoardElement["type"];

export type ElementOfType<T extends ElementType> = Extract<BoardElement, { type: T }>;

/** Formas definidas só pela caixa delimitadora, criadas arrastando de um canto ao outro. */
export type BoxElementType = "rectangle" | "ellipse" | "diamond";

export type BoxElement = ElementOfType<BoxElementType>;

export function isBoxElement(element: BoardElement): element is BoxElement {
  return element.type === "rectangle" || element.type === "ellipse" || element.type === "diamond";
}

export const DEFAULT_STYLE: ElementStyle = {
  strokeColor: "#1e1e1e",
  fillColor: "transparent",
  strokeWidth: 2,
  roughness: 1,
};
