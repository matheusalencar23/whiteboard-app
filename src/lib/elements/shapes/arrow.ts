import type { Point } from "../../types";
import { getBounds, unionBounds } from "../../geometry/bounds";
import { distance, distanceToPolyline } from "../../geometry/distance";
import type { Options } from "roughjs/bin/core";
import { baseFields, roughOptions, scalePoints, type ShapeUtil } from "../shapeUtil";
import type { ArrowElement, ArrowRouting, ArrowSegment } from "../types";

/** Ângulo de cada aba da ponta da seta em relação à haste. */
const HEAD_ANGLE = Math.PI / 7;

/** Pontos em coordenadas de mundo. */
export function getArrowPoints(el: ArrowElement): Point[] {
  return el.points.map((p) => ({ x: el.x + p.x, y: el.y + p.y }));
}

/** Monta a geometria (caixa + pontos relativos) a partir de pontos de mundo. */
function geometryFrom(points: Point[]) {
  const bounds = getBounds(points);
  return {
    ...bounds,
    points: points.map((p) => ({ x: p.x - bounds.x, y: p.y - bounds.y })),
  };
}

export function createArrow(start: Point, end: Point, routing: ArrowRouting = "straight"): ArrowElement {
  const geometry = geometryFrom([start, end]);
  return {
    ...baseFields(geometry),
    type: "arrow",
    points: geometry.points,
    routing,
    startBinding: null,
    endBinding: null,
  };
}

function shiftSegment(s: ArrowSegment, dx: number, dy: number): ArrowSegment {
  return {
    start: { x: s.start.x + dx, y: s.start.y + dy },
    end: { x: s.end.x + dx, y: s.end.y + dy },
  };
}

/**
 * Troca os pontos (de mundo) mantendo id, estilo, seed e ligações. Os trechos
 * fixos continuam no mesmo lugar do mundo (são relativos a `x, y`, que muda).
 */
export function setArrowPoints(el: ArrowElement, points: Point[]): ArrowElement {
  const geometry = geometryFrom(points);
  if (!el.fixedSegments) return { ...el, ...geometry };
  const dx = el.x - geometry.x;
  const dy = el.y - geometry.y;
  return { ...el, ...geometry, fixedSegments: el.fixedSegments.map((s) => shiftSegment(s, dx, dy)) };
}

/** Trechos fixos da seta ortogonal, em coordenadas de mundo. */
export function getFixedSegments(el: ArrowElement): ArrowSegment[] {
  return (el.fixedSegments ?? []).map((s) => shiftSegment(s, el.x, el.y));
}

/** Troca os trechos fixos (de mundo). Lista vazia = rota toda automática. */
export function setFixedSegments(el: ArrowElement, segments: ArrowSegment[]): ArrowElement {
  if (segments.length === 0) return { ...el, fixedSegments: undefined };
  return { ...el, fixedSegments: segments.map((s) => shiftSegment(s, -el.x, -el.y)) };
}

/** Amostras por trecho curvo, para clique, caixa e ponta da seta. */
const CURVE_SAMPLES = 16;

interface CubicSegment {
  from: Point;
  c1: Point;
  c2: Point;
  to: Point;
}

/**
 * Trechos da seta curva: uma curva Catmull-Rom que passa por todos os
 * pontos, convertida em Béziers cúbicas (uma por par de pontos vizinhos).
 * Nas pontas, o ponto ausente é a própria ponta.
 */
function curveSegments(points: Point[]): CubicSegment[] {
  const segments: CubicSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    segments.push({
      from: p1,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      to: p2,
    });
  }
  return segments;
}

function cubicAt({ from, c1, c2, to }: CubicSegment, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * from.x + b * c1.x + c * c2.x + d * to.x,
    y: a * from.y + b * c1.y + c * c2.y + d * to.y,
  };
}

/** A seta é desenhada como curva? Com dois pontos, a curva é uma reta. */
function isCurve(el: ArrowElement): boolean {
  return el.routing === "curved" && el.points.length > 2;
}

/** Raio máximo dos cantos arredondados da seta ortogonal, em unidades de mundo. */
const ELBOW_CORNER_RADIUS = 12;
/** Amostras por canto, só para clique e caixa (o desenho usa o arco de verdade). */
const CORNER_SAMPLES = 6;

interface RoundedCorner {
  /** Onde o arco começa, no trecho de chegada. */
  before: Point;
  corner: Point;
  /** Onde o arco termina, no trecho de saída. */
  after: Point;
}

/** A seta ortogonal tem cantos (desenhados arredondados)? */
function hasRoundedCorners(el: ArrowElement): boolean {
  return el.routing === "elbow" && el.points.length > 2;
}

/** Ponto a `length` de `from` na direção de `to`. */
function towards(from: Point, to: Point, length: number): Point {
  const d = distance(from, to);
  if (d === 0) return from;
  return { x: from.x + ((to.x - from.x) / d) * length, y: from.y + ((to.y - from.y) / d) * length };
}

/**
 * Cantos da seta ortogonal: cada um vira uma Bézier quadrática com controle
 * no próprio canto, que chega e sai na direção dos trechos (sem quina na
 * emenda). O raio diminui em trechos curtos (no máximo metade de cada
 * trecho), para dois cantos vizinhos não se cruzarem.
 */
function roundedCorners(points: Point[]): RoundedCorner[] {
  const corners: RoundedCorner[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];
    const radius = Math.min(ELBOW_CORNER_RADIUS, distance(prev, corner) / 2, distance(corner, next) / 2);
    corners.push({ before: towards(corner, prev, radius), corner, after: towards(corner, next, radius) });
  }
  return corners;
}

function quadraticAt(from: Point, control: Point, to: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  };
}

/**
 * Aleatoriedade dos pontos de controle dos arcos dos cantos. O padrão do
 * roughjs (2 unidades) entorta um arco de raio 12 e faz um degrau na emenda
 * com a reta.
 */
const CORNER_RANDOMNESS = 0.3;

/**
 * Desenha a seta ortogonal: retas entre os cantos e um arco em cada canto.
 * Todos com `preserveVertices`, para o roughjs não sortear as emendas (sem
 * isso, reta e arco não se encontram). As retas mantêm o traço de esboço
 * normal; só os arcos, curtos, tremem menos.
 */
function drawRoundedElbow(
  points: Point[],
  rc: Parameters<ShapeUtil<ArrowElement>["draw"]>[1],
  ctx: CanvasRenderingContext2D,
  options: Options,
) {
  // Pontas redondas se sobrepõem nas emendas e escondem o fio claro que o
  // anti-aliasing deixa entre dois traços encostados.
  ctx.save();
  ctx.lineCap = "round";
  const lineOptions = { ...options, preserveVertices: true };
  const arcOptions = { ...lineOptions, maxRandomnessOffset: CORNER_RANDOMNESS };
  let from = points[0];
  for (const { before, corner, after } of roundedCorners(points)) {
    rc.line(from.x, from.y, before.x, before.y, lineOptions);
    rc.path(`M ${before.x} ${before.y} Q ${corner.x} ${corner.y} ${after.x} ${after.y}`, arcOptions);
    from = after;
  }
  const last = points[points.length - 1];
  rc.line(from.x, from.y, last.x, last.y, lineOptions);
  ctx.restore();
}

/**
 * Caminho desenhado, em coordenadas de mundo. Na curva e nos cantos da
 * ortogonal, os arcos são amostrados como polilinha; na reta, são os próprios
 * pontos.
 */
export function getArrowPath(el: ArrowElement): Point[] {
  const points = getArrowPoints(el);
  if (isCurve(el)) {
    const path = [points[0]];
    for (const segment of curveSegments(points)) {
      for (let s = 1; s <= CURVE_SAMPLES; s++) path.push(cubicAt(segment, s / CURVE_SAMPLES));
    }
    return path;
  }
  if (hasRoundedCorners(el)) {
    const path = [points[0]];
    for (const { before, corner, after } of roundedCorners(points)) {
      for (let s = 0; s <= CORNER_SAMPLES; s++) {
        path.push(quadraticAt(before, corner, after, s / CORNER_SAMPLES));
      }
    }
    path.push(points[points.length - 1]);
    return path;
  }
  return points;
}

/**
 * Meio do trecho entre os pontos `index` e `index + 1`, sobre a linha
 * desenhada (na curva, o ponto da curva, não o meio da reta).
 */
export function getSegmentMidpoint(el: ArrowElement, index: number): Point {
  const points = getArrowPoints(el);
  if (isCurve(el)) return cubicAt(curveSegments(points)[index], 0.5);
  const a = points[index];
  const b = points[index + 1];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Caminho SVG da seta curva, para o `rc.path` do roughjs. */
function curvePathData(points: Point[]): string {
  const parts = [`M ${points[0].x} ${points[0].y}`];
  for (const { c1, c2, to } of curveSegments(points)) {
    parts.push(`C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`);
  }
  return parts.join(" ");
}

/**
 * A ponta e as duas abas, em coordenadas de mundo: `[ponta, aba, aba]`.
 * `null` quando o último segmento tem comprimento zero.
 */
function getArrowHead(el: ArrowElement): [Point, Point, Point] | null {
  // A direção vem do fim da linha desenhada (a tangente, na curva). O tamanho
  // é limitado pelo último trecho entre pontos, não pela última amostra.
  const path = getArrowPath(el);
  const points = getArrowPoints(el);
  const tip = path[path.length - 1];
  const from = path[path.length - 2];
  const segment = distance(points[points.length - 2], points[points.length - 1]);
  if (distance(from, tip) === 0 || segment === 0) return null;

  const headLength = Math.min(16 + el.style.strokeWidth * 2, segment / 2);
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const [left, right] = [-1, 1].map((side) => {
    const a = angle + Math.PI + side * HEAD_ANGLE;
    return { x: tip.x + Math.cos(a) * headLength, y: tip.y + Math.sin(a) * headLength };
  });
  return [tip, left, right];
}

export const arrowUtil: ShapeUtil<ArrowElement> = {
  draw(el, rc, ctx) {
    const points = getArrowPoints(el);
    const options = roughOptions(el.style, el.seed);
    if (isCurve(el)) {
      rc.path(curvePathData(points), options);
    } else if (hasRoundedCorners(el)) {
      drawRoundedElbow(points, rc, ctx, options);
    } else {
      rc.linearPath(
        points.map((p): [number, number] => [p.x, p.y]),
        options,
      );
    }

    const head = getArrowHead(el);
    if (!head) return;
    const [tip, left, right] = head;
    rc.line(tip.x, tip.y, left.x, left.y, options);
    rc.line(tip.x, tip.y, right.x, right.y, options);
  },

  hitTest(el, p, tolerance) {
    const t = tolerance + el.style.strokeWidth / 2;
    return distanceToPolyline(p, getArrowPath(el)) <= t;
  },

  resize(el, bounds) {
    const resized = { ...el, ...bounds, points: scalePoints(el.points, el, bounds) };
    if (!el.fixedSegments) return resized;
    const fixedSegments = el.fixedSegments.map((s) => {
      const [start, end] = scalePoints([s.start, s.end], el, bounds);
      return { start, end };
    });
    return { ...resized, fixedSegments };
  },

  // A ponta é desenhada além do último ponto, e a curva pode passar além
  // dos pontos, então as duas entram na caixa.
  getBounds(el) {
    const box = isCurve(el)
      ? getBounds(getArrowPath(el))
      : { x: el.x, y: el.y, width: el.width, height: el.height };
    const head = getArrowHead(el);
    return head ? unionBounds([box, getBounds(head)]) : box;
  },
};
