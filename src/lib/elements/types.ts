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

export interface RectangleElement extends BaseElement {
  type: "rectangle";
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
}

export interface DiamondElement extends BaseElement {
  type: "diamond";
}

/**
 * Elementos feitos de pontos. Os `points` são relativos a (`x`, `y`), então
 * mover o elemento só muda `x` e `y`.
 */
export interface ArrowElement extends BaseElement {
  type: "arrow";
  points: Point[];
  /** Forma a que a primeira ponta está ligada, se houver. */
  startBinding: ArrowBinding | null;
  /** Forma a que a última ponta está ligada, se houver. */
  endBinding: ArrowBinding | null;
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

export const DEFAULT_STYLE: ElementStyle = {
  strokeColor: "#1e1e1e",
  fillColor: "transparent",
  strokeWidth: 2,
  roughness: 1,
};
