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
