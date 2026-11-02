import type { Point } from "../../types";
import { getBounds } from "../../geometry/bounds";
import { distance, distanceToPolyline } from "../../geometry/distance";
import { baseFields, roughOptions, scalePoints, type ShapeUtil } from "../shapeUtil";
import type { ArrowElement } from "../types";

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

export function createArrow(start: Point, end: Point): ArrowElement {
  const geometry = geometryFrom([start, end]);
  return { ...baseFields(geometry), type: "arrow", points: geometry.points };
}

/** Troca os pontos (de mundo) mantendo id, estilo e seed. */
export function setArrowPoints(el: ArrowElement, points: Point[]): ArrowElement {
  return { ...el, ...geometryFrom(points) };
}

export const arrowUtil: ShapeUtil<ArrowElement> = {
  draw(el, rc) {
    const points = getArrowPoints(el);
    const options = roughOptions(el.style, el.seed);
    rc.linearPath(
      points.map((p): [number, number] => [p.x, p.y]),
      options,
    );

    // Ponta na direção do último segmento.
    const tip = points[points.length - 1];
    const from = points[points.length - 2];
    const length = distance(from, tip);
    if (length === 0) return;

    const headLength = Math.min(16 + el.style.strokeWidth * 2, length / 2);
    const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
    for (const side of [-1, 1]) {
      const a = angle + Math.PI + side * HEAD_ANGLE;
      rc.line(
        tip.x,
        tip.y,
        tip.x + Math.cos(a) * headLength,
        tip.y + Math.sin(a) * headLength,
        options,
      );
    }
  },

  hitTest(el, p, tolerance) {
    const t = tolerance + el.style.strokeWidth / 2;
    return distanceToPolyline(p, getArrowPoints(el)) <= t;
  },

  resize(el, bounds) {
    return { ...el, ...bounds, points: scalePoints(el.points, el, bounds) };
  },
};
