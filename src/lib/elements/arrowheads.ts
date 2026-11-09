import type { Point } from "../types";
import type { Arrowhead } from "./types";

export type ArrowheadPart =
  | { kind: "line"; from: Point; to: Point }
  | { kind: "polygon"; points: Point[]; filled: boolean }
  | { kind: "circle"; center: Point; radius: number; filled: boolean };

export interface ArrowheadGeometry {
  parts: ArrowheadPart[];
  retreat: number;
}

const HEAD_ANGLE = Math.PI / 7;
const CIRCLE_RATIO = 0.3;
const DIAMOND_WIDTH_RATIO = 0.35;
const BAR_RATIO = 0.5;
const CROSS_RATIO = 0.3;
const ER_SPREAD_RATIO = 0.45;
const ER_CIRCLE_RATIO = 0.28;

export function getArrowheadParts(
  arrowhead: Arrowhead,
  tip: Point,
  back: number,
  size: number,
): ArrowheadGeometry | null {
  const along = (offset: number, across = 0): Point => {
    const perp = back + Math.PI / 2;
    return {
      x: tip.x + Math.cos(back) * offset + Math.cos(perp) * across,
      y: tip.y + Math.sin(back) * offset + Math.sin(perp) * across,
    };
  };
  const angled = (sign: number) => ({
    x: tip.x + Math.cos(back + sign * HEAD_ANGLE) * size,
    y: tip.y + Math.sin(back + sign * HEAD_ANGLE) * size,
  });
  const line = (from: Point, to: Point): ArrowheadPart => ({ kind: "line", from, to });
  const bar = (offset: number, halfLength = size * ER_SPREAD_RATIO) =>
    line(along(offset, -halfLength), along(offset, halfLength));
  const triangle = (filled: boolean): ArrowheadGeometry => ({
    parts: [{ kind: "polygon", points: [tip, angled(-1), angled(1)], filled }],
    retreat: size * Math.cos(HEAD_ANGLE),
  });
  const circle = (filled: boolean): ArrowheadGeometry => {
    const radius = size * CIRCLE_RATIO;
    return { parts: [{ kind: "circle", center: along(radius), radius, filled }], retreat: radius * 2 };
  };
  const diamond = (filled: boolean): ArrowheadGeometry => {
    const width = size * DIAMOND_WIDTH_RATIO;
    const points = [tip, along(size / 2, -width), along(size), along(size / 2, width)];
    return { parts: [{ kind: "polygon", points, filled }], retreat: size };
  };
  const crowFoot = (): ArrowheadPart[] => {
    const spread = size * ER_SPREAD_RATIO;
    return [line(along(size), along(0, -spread)), line(along(size), along(0, spread))];
  };
  const zeroCircle = (offset: number): ArrowheadPart => {
    const radius = size * ER_CIRCLE_RATIO;
    return { kind: "circle", center: along(offset + radius), radius, filled: false };
  };

  switch (arrowhead) {
    case "none":
      return null;
    case "arrow":
      return { parts: [line(tip, angled(-1)), line(tip, angled(1))], retreat: 0 };
    case "triangle":
      return triangle(true);
    case "triangleOutline":
      return triangle(false);
    case "circle":
      return circle(true);
    case "circleOutline":
      return circle(false);
    case "diamond":
      return diamond(true);
    case "diamondOutline":
      return diamond(false);
    case "bar":
      return { parts: [bar(0, size * BAR_RATIO)], retreat: 0 };
    case "cross": {
      const half = size * CROSS_RATIO;
      const center = size * 0.5;
      return {
        parts: [
          line(along(center - half, -half), along(center + half, half)),
          line(along(center - half, half), along(center + half, -half)),
        ],
        retreat: 0,
      };
    }
    case "erOne":
      return { parts: [bar(size * 0.5)], retreat: 0 };
    case "erMandOne":
      return { parts: [bar(size * 0.5), bar(size * 0.85)], retreat: 0 };
    case "erMany":
      return { parts: crowFoot(), retreat: 0 };
    case "erOneToMany":
      return { parts: [...crowFoot(), bar(size * 1.3)], retreat: 0 };
    case "erZeroToOne":
      return { parts: [bar(size * 0.5), zeroCircle(size * 0.8)], retreat: 0 };
    case "erZeroToMany":
      return { parts: [...crowFoot(), zeroCircle(size * 1.15)], retreat: 0 };
  }
}

export function getArrowheadHoles(geometry: ArrowheadGeometry) {
  return geometry.parts.flatMap((part) => (part.kind === "circle" && !part.filled ? [part] : []));
}

export function getArrowheadPoints(geometry: ArrowheadGeometry): Point[] {
  return geometry.parts.flatMap((part) => {
    if (part.kind === "line") return [part.from, part.to];
    if (part.kind === "polygon") return part.points;
    const { center, radius } = part;
    return [
      { x: center.x - radius, y: center.y - radius },
      { x: center.x + radius, y: center.y + radius },
    ];
  });
}
