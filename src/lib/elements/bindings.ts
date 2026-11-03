import type { Point } from "../types";
import { expandBounds, getCenter, type Bounds } from "../geometry/bounds";
import { distance, rotatePoint } from "../geometry/distance";
import { routeOrthogonal, simplifyPath, type RouteEnd } from "../geometry/orthogonalRoute";
import { getBorderPoint, getConnectionAnchors, isBindable, isInsideShape } from "./registry";
import { getArrowPoints, getFixedSegments, setArrowPoints, setFixedSegments } from "./shapes/arrow";
import type { ArrowBinding, ArrowElement, ArrowRouting, ArrowSegment, BoardElement } from "./types";

/**
 * Ligações de setas a formas. Funções puras: a store chama
 * `updateBoundArrows` sempre que elementos mudam, e o resto do código não
 * precisa saber que ligações existem.
 */

/** Distância entre a ponta de uma seta flutuante e a borda da forma, em unidades de mundo. */
export const BINDING_GAP = 6;

/**
 * Na seta ortogonal, distância da borda da forma em que a rota anda ao
 * contorná-la e comprimento mínimo do trecho reto que sai da forma.
 */
export const ELBOW_MARGIN = 30;

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
  if (arrow.routing === "elbow") return refreshElbowArrow(arrow, byId);

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

/** Eixo dominante de `v` como direção unitária (horizontal no empate). */
function axisDir(v: Point): Point {
  if (Math.abs(v.x) >= Math.abs(v.y)) return { x: v.x < 0 ? -1 : 1, y: 0 };
  return { x: 0, y: v.y < 0 ? -1 : 1 };
}

/** Caixa da forma sem rotação, que a rota ortogonal contorna. */
function shapeBox(shape: BoardElement): Bounds {
  return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
}

/**
 * Ponta ortogonal ligada a `shape`. Com anchor, sai pelo lado do ponto de
 * conexão. Na ligação flutuante, escolhe o lado virado para `towards` e sai
 * do meio dele.
 */
function elbowBoundEnd(shape: BoardElement, binding: ArrowBinding, towards: Point): RouteEnd {
  let dir: Point;
  let border: Point;
  if (binding.anchor) {
    const offset = { x: binding.anchor.x - 0.5, y: binding.anchor.y - 0.5 };
    // Anchor no centro não tem lado: usa a direção do destino.
    dir = offset.x === 0 && offset.y === 0 ? axisDir(sub(towards, getCenter(shape))) : axisDir(offset);
    border = anchorPoint(shape, binding.anchor);
  } else {
    const center = getCenter(shape);
    const v = sub(towards, center);
    // Normaliza pelo tamanho, para uma forma larga sair pelos lados com mais facilidade.
    dir = axisDir({ x: v.x / Math.max(shape.width, 1), y: v.y / Math.max(shape.height, 1) });
    border = getBorderPoint(shape, dir);
  }
  return {
    point: { x: border.x + dir.x * BINDING_GAP, y: border.y + dir.y * BINDING_GAP },
    dir,
    obstacle: expandBounds(shapeBox(shape), ELBOW_MARGIN),
  };
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Recalcula a seta ortogonal inteira: as pontas ligadas (pelo lado da forma)
 * e a rota entre elas. Pontas soltas ficam onde estão e saem pelo eixo
 * dominante em direção à outra ponta.
 */
function refreshElbowArrow(arrow: ArrowElement, byId: Map<string, BoardElement>): ArrowElement {
  const points = getArrowPoints(arrow);
  const start = arrow.startBinding && byId.get(arrow.startBinding.elementId);
  const end = arrow.endBinding && byId.get(arrow.endBinding.elementId);
  const first = points[0];
  const last = points[points.length - 1];

  // Primeiro as pontas ligadas. Na ligação flutuante, cada uma sai pelo lado
  // virado para onde a seta vai a seguir: o trecho fixo mais próximo na
  // rota, ou, sem trechos fixos, a outra ponta.
  const fixed = getFixedSegments(arrow);
  const startFocus =
    fixed.length > 0
      ? fixed[0].start
      : end && arrow.endBinding
        ? focusPoint(end, arrow.endBinding)
        : last;
  const endFocus =
    fixed.length > 0
      ? fixed[fixed.length - 1].end
      : start && arrow.startBinding
        ? focusPoint(start, arrow.startBinding)
        : first;
  const startEnd = start && arrow.startBinding ? elbowBoundEnd(start, arrow.startBinding, startFocus) : null;
  const endEnd = end && arrow.endBinding ? elbowBoundEnd(end, arrow.endBinding, endFocus) : null;

  // Com trechos fixos, a rota é montada em pedaços ligando-os em ordem.
  if (fixed.length > 0) {
    let from: RouteEnd = startEnd ?? {
      point: first,
      dir: axisDir(sub(fixed[0].start, first)),
      obstacle: null,
    };
    const route: Point[] = [];
    for (const segment of fixed) {
      const along = axisDir(sub(segment.end, segment.start));
      // Chega no início do trecho (pode virar ali) e sai do fim dele.
      route.push(...routeOrthogonal(from, { point: segment.start, dir: neg(along), obstacle: null, corner: true }));
      from = { point: segment.end, dir: along, obstacle: null, corner: true };
    }
    route.push(
      ...routeOrthogonal(
        from,
        endEnd ?? { point: last, dir: axisDir(sub(from.point, last)), obstacle: null },
      ),
    );
    return setArrowPoints(arrow, simplifyPath(route));
  }

  // Depois as soltas, que dependem da posição final da outra ponta.
  const startPoint = startEnd?.point ?? first;
  const endPoint = endEnd?.point ?? last;
  const route = routeOrthogonal(
    startEnd ?? { point: first, dir: axisDir(sub(endPoint, first)), obstacle: null },
    // `dir` do fim aponta para fora: o oposto da direção de chegada.
    endEnd ?? { point: last, dir: axisDir(sub(startPoint, last)), obstacle: null },
  );
  return setArrowPoints(arrow, route);
}

const EPSILON = 1e-6;

function neg(p: Point): Point {
  return { x: -p.x, y: -p.y };
}

/**
 * O trecho fixo `s` está sobre o trecho `a`–`b` da seta: mesma reta e com
 * uma parte em comum (só encostar no canto não conta, porque os vizinhos de
 * um trecho são perpendiculares e encostam nele).
 */
function segmentOverlaps(a: Point, b: Point, s: ArrowSegment): boolean {
  const overlap = (p1: number, p2: number, q1: number, q2: number) =>
    Math.min(Math.max(p1, p2), Math.max(q1, q2)) - Math.max(Math.min(p1, p2), Math.min(q1, q2));
  if (Math.abs(a.y - b.y) < EPSILON) {
    return (
      Math.abs(s.start.y - a.y) < EPSILON &&
      Math.abs(s.end.y - a.y) < EPSILON &&
      overlap(a.x, b.x, s.start.x, s.end.x) > EPSILON
    );
  }
  return (
    Math.abs(s.start.x - a.x) < EPSILON &&
    Math.abs(s.end.x - a.x) < EPSILON &&
    overlap(a.y, b.y, s.start.y, s.end.y) > EPSILON
  );
}

/** Trechos fixos que estão sobre o trecho `index` da seta. */
function fixedOnSegment(arrow: ArrowElement, index: number): ArrowSegment[] {
  const points = getArrowPoints(arrow);
  return getFixedSegments(arrow).filter((s) => segmentOverlaps(points[index], points[index + 1], s));
}

function samePoint(p: Point, q: Point): boolean {
  return Math.abs(p.x - q.x) < EPSILON && Math.abs(p.y - q.y) < EPSILON;
}

/** O trecho `index` da seta ortogonal foi arrastado pelo usuário (é fixo)? */
export function isSegmentFixed(arrow: ArrowElement, index: number): boolean {
  return fixedOnSegment(arrow, index).length > 0;
}

/**
 * Move o trecho `index` (entre os pontos `index` e `index + 1`) de uma seta
 * ortogonal até `to`, na perpendicular: um trecho horizontal sobe ou desce, um
 * vertical vai para os lados. O trecho vira fixo; os outros fixos continuam.
 *
 * Trecho que toca uma ponta ligada: a ponta continua presa à forma, e o
 * trecho fixo começa um pouco depois dela, para a rota fazer um "degrau"
 * saindo da forma (como no Excalidraw). Numa ponta solta, a própria ponta
 * acompanha o trecho.
 */
export function moveElbowSegment(arrow: ArrowElement, index: number, to: Point): ArrowElement {
  const points = getArrowPoints(arrow);
  const last = points.length - 1;
  const a = points[index];
  const b = points[index + 1];
  const horizontal = Math.abs(a.y - b.y) < EPSILON;
  const shift = (p: Point): Point => (horizontal ? { ...p, y: to.y } : { ...p, x: to.x });

  const moved: ArrowSegment = {
    start: shift(index === 0 && arrow.startBinding ? stubFrom(a, b) : a),
    end: shift(index + 1 === last && arrow.endBinding ? stubFrom(b, a) : b),
  };
  if (index === 0 && !arrow.startBinding) points[0] = shift(points[0]);
  if (index + 1 === last && !arrow.endBinding) points[last] = shift(points[last]);

  // Os vizinhos fixos encostam no trecho movido: a ponta que encosta vai
  // junto (o vizinho só muda de comprimento, no próprio eixo).
  const follow = (s: ArrowSegment, corner: Point): ArrowSegment => ({
    start: samePoint(s.start, corner) ? shift(s.start) : s.start,
    end: samePoint(s.end, corner) ? shift(s.end) : s.end,
  });

  // Na ordem da seta: o trecho movido no lugar dele, os outros fixos onde estão.
  const segments: ArrowSegment[] = [];
  for (let i = 0; i < last; i++) {
    if (i === index) segments.push(moved);
    else if (i === index - 1) segments.push(...fixedOnSegment(arrow, i).map((s) => follow(s, a)));
    else if (i === index + 1) segments.push(...fixedOnSegment(arrow, i).map((s) => follow(s, b)));
    else segments.push(...fixedOnSegment(arrow, i));
  }
  return setFixedSegments(setArrowPoints(arrow, points), segments);
}

/**
 * Solta o trecho `index` da seta ortogonal: ele deixa de ser fixo, e a rota em
 * volta dele volta a ser automática. Os outros trechos fixos continuam.
 */
export function releaseElbowSegment(
  arrow: ArrowElement,
  index: number,
  byId: Map<string, BoardElement>,
): ArrowElement {
  const released = new Set(fixedOnSegment(arrow, index));
  const world = getFixedSegments(arrow);
  // `fixedOnSegment` devolve objetos novos: compara pelas coordenadas.
  const key = (s: ArrowSegment) => `${s.start.x},${s.start.y},${s.end.x},${s.end.y}`;
  const releasedKeys = new Set([...released].map(key));
  const remaining = world.filter((s) => !releasedKeys.has(key(s)));
  return refreshArrow(setFixedSegments(arrow, remaining), byId);
}

/**
 * Ponto a um trecho curto de `end` em direção a `toward`: onde o trecho fixo
 * começa quando toca uma ponta presa à forma.
 */
function stubFrom(end: Point, toward: Point): Point {
  const d = distance(end, toward);
  if (d === 0) return end;
  const length = Math.min(ELBOW_MARGIN, d / 2);
  return { x: end.x + ((toward.x - end.x) / d) * length, y: end.y + ((toward.y - end.y) / d) * length };
}

/**
 * Remove o ponto do meio `index` de uma seta reta ou curva (a dobra some).
 * As pontas não podem ser removidas.
 */
export function removeArrowPoint(
  arrow: ArrowElement,
  index: number,
  byId: Map<string, BoardElement>,
): ArrowElement {
  const points = getArrowPoints(arrow);
  if (index <= 0 || index >= points.length - 1) return arrow;
  points.splice(index, 1);
  // As pontas ligadas miram o ponto vizinho, que mudou.
  return refreshArrow(setArrowPoints(arrow, points), byId);
}


/**
 * Troca o tipo da seta, mantendo as ligações. Entre reta e curva, os pontos
 * continuam (só muda o desenho). Entrando ou saindo da ortogonal, a seta fica
 * só com as pontas: os pontos da rota não fazem sentido como pontos livres, e
 * vice-versa.
 */
export function setArrowRouting(
  arrow: ArrowElement,
  routing: ArrowRouting,
  byId: Map<string, BoardElement>,
): ArrowElement {
  if (arrow.routing === routing) return arrow;
  if (arrow.routing !== "elbow" && routing !== "elbow") return { ...arrow, routing };
  const points = getArrowPoints(arrow);
  const ends = [points[0], points[points.length - 1]];
  return refreshArrow(setArrowPoints({ ...arrow, routing, fixedSegments: undefined }, ends), byId);
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
    if (el.type !== "arrow") return el;
    // Seta solta não depende de nada. A ortogonal solta ainda precisa refazer
    // a rota quando as próprias pontas mudam.
    if (!el.startBinding && !el.endBinding && (el.routing !== "elbow" || !changed.has(el.id))) {
      return el;
    }

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
