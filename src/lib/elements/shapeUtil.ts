import { nanoid } from "nanoid";
import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Options } from "roughjs/bin/core";
import type { Point } from "../types";
import type { Bounds } from "../geometry/bounds";
import { DEFAULT_STYLE, type BoardElement, type ElementStyle } from "./types";

/**
 * Comportamento de um tipo de elemento. Cada forma em `shapes/` exporta um
 * desses, e `registry.ts` despacha pelo `type` do elemento.
 */
export interface ShapeUtil<T extends BoardElement> {
  /** Desenha em coordenadas de mundo, sem rotação (quem chama aplica). */
  draw(element: T, rc: RoughCanvas, ctx: CanvasRenderingContext2D): void;
  /**
   * `point` já vem no espaço do elemento sem rotação. `tolerance` é a folga
   * em unidades de mundo para facilitar acertar traços finos.
   */
  hitTest(element: T, point: Point, tolerance: number): boolean;
  /** Ajusta o elemento para ocupar a nova caixa delimitadora. */
  resize(element: T, bounds: Bounds): T;
  /**
   * Caixa ocupada pelo desenho, quando é maior que `x, y, width, height`
   * (ex.: a ponta da seta). Sem ela, vale a caixa do elemento.
   */
  getBounds?(element: T): Bounds;
  /**
   * Só nas formas em que setas podem se ligar. Dada uma direção a partir do
   * centro (no espaço sem rotação), devolve o deslocamento do centro até a borda.
   */
  getBorderOffset?(element: T, direction: Point): Point;
  /**
   * Pontos fixos em que uma seta pode se ligar, em coordenadas relativas à
   * caixa (0 a 1 em `x` e `y`). Viram o `anchor` da ligação.
   */
  getConnectionPoints?(element: T): Point[];
  /**
   * Só nas formas que aceitam rótulo: a área (sem rotação) em que o texto
   * quebra linha e é centralizado.
   */
  getLabelArea?(element: T): Bounds;
}

/** Área centralizada na caixa do elemento, com uma fração da largura e da altura. */
export function centeredArea(el: Bounds, fx: number, fy: number): Bounds {
  const width = el.width * fx;
  const height = el.height * fy;
  return {
    x: el.x + (el.width - width) / 2,
    y: el.y + (el.height - height) / 2,
    width,
    height,
  };
}

/** O meio de cada lado da caixa: topo, direita, base e esquerda. */
export const SIDE_MIDPOINTS: readonly Point[] = [
  { x: 0.5, y: 0 },
  { x: 1, y: 0.5 },
  { x: 0.5, y: 1 },
  { x: 0, y: 0.5 },
];

/**
 * Escala `direction` para tocar a borda, dado o "tamanho" `s` da direção na
 * métrica da forma (s = 1 exatamente na borda).
 */
export function scaleToBorder(direction: Point, s: number): Point {
  if (!Number.isFinite(s) || s === 0) return { x: 0, y: 0 };
  return { x: direction.x / s, y: direction.y / s };
}

/** Campos comuns para um elemento novo. */
export function baseFields(bounds: Bounds) {
  return {
    id: nanoid(),
    ...bounds,
    rotation: 0,
    style: { ...DEFAULT_STYLE },
    seed: rough.newSeed(),
  };
}

/** Opções do roughjs a partir do estilo do elemento. */
export function roughOptions(style: ElementStyle, seed: number): Options {
  return {
    seed,
    stroke: style.strokeColor,
    strokeWidth: style.strokeWidth,
    roughness: style.roughness,
    fill: style.fillColor === "transparent" ? undefined : style.fillColor,
  };
}

export function isFilled(style: ElementStyle): boolean {
  return style.fillColor !== "transparent";
}

/** Resize de formas que são só uma caixa: basta trocar a caixa. */
export function resizeBox<T extends BoardElement>(element: T, bounds: Bounds): T {
  return { ...element, ...bounds };
}

/** Escala pontos relativos para caberem numa nova largura/altura. */
export function scalePoints(points: Point[], from: Bounds, to: Bounds): Point[] {
  const sx = from.width === 0 ? 1 : to.width / from.width;
  const sy = from.height === 0 ? 1 : to.height / from.height;
  return points.map((p) => ({ x: p.x * sx, y: p.y * sy }));
}
