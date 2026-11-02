export interface ElementStyle {
  strokeColor: string;
  /** "transparent" = sem preenchimento. */
  fillColor: string;
  strokeWidth: number;
  /** Intensidade do traço de esboço do roughjs (0 = traço limpo). */
  roughness: number;
}

/** Campos comuns a todo elemento. Coordenadas sempre em espaço de mundo. */
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

/** União de todos os tipos de elemento. Novas formas entram aqui. */
export type BoardElement = RectangleElement;

export type ElementType = BoardElement["type"];

export const DEFAULT_STYLE: ElementStyle = {
  strokeColor: "#1e1e1e",
  fillColor: "transparent",
  strokeWidth: 2,
  roughness: 1,
};
