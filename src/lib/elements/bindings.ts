import type { Point } from "../types";
import { getCenter } from "../geometry/bounds";
import { distance, rotatePoint } from "../geometry/distance";
import { getBorderPoint, getConnectionAnchors, isBindable, isInsideShape } from "./registry";
import { getArrowPoints, setArrowPoints } from "./shapes/arrow";
import type { ArrowBinding, ArrowElement, BoardElement } from "./types";

/**
 * Ligações de setas a formas. Funções puras: a store chama
 * `updateBoundArrows` sempre que elementos mudam, e o resto do código não
 * precisa saber que ligações existem.
 */

/** Distância entre a ponta de uma seta flutuante e a borda da forma, em unidades de mundo. */
export const BINDING_GAP = 6;

export type ArrowEnd = "start" | "end";

/** Ponto da forma correspondente ao `anchor`, em coordenadas de mundo. */
export function anchorPoint(shape: BoardElement, anchor: Point): Point {
  const p = { x: shape.x + anchor.x * shape.width, y: shape.y + anchor.y * shape.height };
  return rotatePoint(p, getCenter(shape), shape.rotation);
}

/** Para onde a ponta ligada "mira": o anchor ou, na ligação flutuante, o centro. */
function focusPoint(shape: BoardElement, binding: ArrowBinding): Point {
  return binding.anchor ? anchorPoint(shape, binding.anchor) : getCenter(shape);
}

/** Posição da ponta ligada a `shape`, vindo de `from` (o ponto vizinho da seta). */
function bindingPoint(shape: BoardElement, binding: ArrowBinding, from: Point): Point {
  const center = getCenter(shape);

  // Com anchor, a ponta fica no ponto fixo, afastada do centro para fora.
  // Sem anchor, a ponta mira o centro vindo do vizinho e para na borda.
  const border = binding.anchor
    ? anchorPoint(shape, binding.anchor)
    : getBorderPoint(shape, { x: from.x - center.x, y: from.y - center.y });

  const dir = { x: border.x - center.x, y: border.y - center.y };
  const length = Math.hypot(dir.x, dir.y);
  if (length === 0) return border;
  return {
    x: border.x + (dir.x / length) * BINDING_GAP,
    y: border.y + (dir.y / length) * BINDING_GAP,
  };
}

/**
 * Recalcula as pontas ligadas de uma seta a partir das formas em `byId`.
 * Numa seta de dois pontos com as duas pontas ligadas, cada ponta mira o
 * centro (ou anchor) da outra forma, como no Excalidraw.
 */
export function refreshArrow(arrow: ArrowElement, byId: Map<string, BoardElement>): ArrowElement {
  const start = arrow.startBinding && byId.get(arrow.startBinding.elementId);
  const end = arrow.endBinding && byId.get(arrow.endBinding.elementId);
  if (!start && !end) return arrow;

  const points = getArrowPoints(arrow);
  const last = points.length - 1;
  const startFrom =
    last > 1 ? points[1] : end && arrow.endBinding ? focusPoint(end, arrow.endBinding) : points[last];
  const endFrom =
    last > 1
      ? points[last - 1]
      : start && arrow.startBinding
        ? focusPoint(start, arrow.startBinding)
        : points[0];

  if (start && arrow.startBinding) points[0] = bindingPoint(start, arrow.startBinding, startFrom);
  if (end && arrow.endBinding) points[last] = bindingPoint(end, arrow.endBinding, endFrom);
  return setArrowPoints(arrow, points);
}

/**
 * Atualiza as setas afetadas pela mudança dos elementos `changedIds`: as
 * ligadas a eles e as próprias setas alteradas. Ligações a elementos que não
 * existem mais viram `null`, e a ponta fica onde estava.
 * Devolve o mesmo array se nada mudou.
 */
export function updateBoundArrows(
  elements: BoardElement[],
  changedIds: Iterable<string>,
): BoardElement[] {
  const changed = new Set(changedIds);
  const byId = new Map(elements.map((el) => [el.id, el]));
  let didChange = false;

  const result = elements.map((el) => {
    if (el.type !== "arrow" || (!el.startBinding && !el.endBinding)) return el;

    let arrow = el;
    const startId = arrow.startBinding?.elementId;
    const endId = arrow.endBinding?.elementId;
    if (startId && !byId.has(startId)) arrow = { ...arrow, startBinding: null };
    if (endId && !byId.has(endId)) arrow = { ...arrow, endBinding: null };

    const affected =
      changed.has(arrow.id) ||
      (startId !== undefined && changed.has(startId)) ||
      (endId !== undefined && changed.has(endId));
    if (affected) arrow = refreshArrow(arrow, byId);

    if (arrow !== el) didChange = true;
    return arrow;
  });

  return didChange ? result : elements;
}

/**
 * Forma em que uma ponta de seta se ligaria no ponto `point`: a mais acima
 * cujo interior (com folga `tolerance`) contém o ponto. Formas sem
 * preenchimento também contam pelo interior.
 */
export function getBindableAt(
  elements: BoardElement[],
  point: Point,
  tolerance: number,
  excludeIds: (string | null | undefined)[] = [],
): BoardElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (!isBindable(el) || excludeIds.includes(el.id)) continue;
    if (isInsideShape(el, point, tolerance)) return el;
  }
  return null;
}

/**
 * Ligação que uma ponta de seta em `point` faria: com a forma sob o ponto e,
 * se houver um ponto de conexão a até `snapDistance`, com o anchor dele.
 * Longe dos pontos, mas sobre a forma, a ligação é flutuante.
 */
export function findBinding(
  elements: BoardElement[],
  point: Point,
  tolerance: number,
  snapDistance: number,
  excludeIds: (string | null | undefined)[] = [],
): ArrowBinding | null {
  // Fora da folga da forma, ainda liga se estiver perto de um ponto de conexão.
  const inside = getBindableAt(elements, point, tolerance, excludeIds);
  const target = inside ?? getBindableAt(elements, point, snapDistance, excludeIds);
  if (!target) return null;

  let anchor: Point | null = null;
  let best = snapDistance;
  for (const candidate of getConnectionAnchors(target)) {
    const d = distance(anchorPoint(target, candidate), point);
    if (d <= best) {
      best = d;
      anchor = candidate;
    }
  }
  if (!inside && !anchor) return null;
  return { elementId: target.id, anchor };
}

export function sameBinding(a: ArrowBinding | null, b: ArrowBinding | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.elementId !== b.elementId) return false;
  if (a.anchor === null || b.anchor === null) return a.anchor === b.anchor;
  return a.anchor.x === b.anchor.x && a.anchor.y === b.anchor.y;
}

export function getBinding(arrow: ArrowElement, end: ArrowEnd): ArrowBinding | null {
  return end === "start" ? arrow.startBinding : arrow.endBinding;
}

/** Troca a ligação de uma ponta, sem recalcular a posição. */
export function setBinding(
  arrow: ArrowElement,
  end: ArrowEnd,
  binding: ArrowBinding | null,
): ArrowElement {
  return end === "start" ? { ...arrow, startBinding: binding } : { ...arrow, endBinding: binding };
}

/**
 * Desliga as pontas de setas cuja forma não está em `keepIds`. Usado ao
 * mover ou redimensionar setas sem as formas a que estão ligadas: a seta sai
 * do lugar, então a ligação deixa de valer.
 */
export function releaseBindings(elements: BoardElement[], keepIds: Set<string>): BoardElement[] {
  return elements.map((el) => {
    if (el.type !== "arrow") return el;
    const keepStart = !el.startBinding || keepIds.has(el.startBinding.elementId);
    const keepEnd = !el.endBinding || keepIds.has(el.endBinding.elementId);
    if (keepStart && keepEnd) return el;
    return {
      ...el,
      startBinding: keepStart ? el.startBinding : null,
      endBinding: keepEnd ? el.endBinding : null,
    };
  });
}
