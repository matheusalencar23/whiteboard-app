import type { Point } from "../../types";
import type { Bounds } from "../../geometry/bounds";
import { polygonFigure, polylineFigure, quarterArc, type Figure, type PathFigure } from "../../geometry/figure";
import type { ShapeKind } from "../types";
import { centeredArea } from "../shapeUtil";

export interface ShapeKindDefinition {
  outline(box: Bounds): Figure;
  details?(box: Bounds, strokeWidth: number): Figure[];
  labelArea(box: Bounds, strokeWidth: number): Bounds;
  connectionPoints?: readonly Point[];
  bindToBox?: boolean;
}

const PARALLELOGRAM_SKEW = 0.2;

const DOCUMENT_WAVE = 0.1;

function roundedRectFigure({ x, y, width: w, height: h }: Bounds, radius: number): PathFigure {
  const r = Math.min(radius, w / 2, h / 2);
  return {
    kind: "path",
    start: { x: x + r, y },
    closed: true,
    segments: [
      { kind: "line", to: { x: x + w - r, y } },
      quarterArc({ x: x + w - r, y }, { x: x + w, y: y + r }, { x: x + w, y }),
      { kind: "line", to: { x: x + w, y: y + h - r } },
      quarterArc({ x: x + w, y: y + h - r }, { x: x + w - r, y: y + h }, { x: x + w, y: y + h }),
      { kind: "line", to: { x: x + r, y: y + h } },
      quarterArc({ x: x + r, y: y + h }, { x, y: y + h - r }, { x, y: y + h }),
      { kind: "line", to: { x, y: y + r } },
      quarterArc({ x, y: y + r }, { x: x + r, y }, { x, y }),
    ],
  };
}

function rectFigure({ x, y, width: w, height: h }: Bounds): PathFigure {
  return polygonFigure([
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]);
}

function insetX(box: Bounds, inset: number): Bounds {
  const width = Math.max(box.width - inset * 2, 0);
  return { ...box, x: box.x + (box.width - width) / 2, width };
}

function terminalRadius(box: Bounds): number {
  return Math.min(box.width, box.height) / 2;
}

function parallelogramSkew(box: Bounds): number {
  return box.width * PARALLELOGRAM_SKEW;
}

function documentWave(box: Bounds): number {
  return box.height * DOCUMENT_WAVE;
}

const WAVE_CONTROL = 4 / 3;

function cylinderCap(box: Bounds): number {
  return Math.min(box.height * 0.12, box.width * 0.25);
}

function subprocessBar(box: Bounds): number {
  return Math.min(box.width * 0.1, 20);
}

function noteFold(box: Bounds): number {
  return Math.min(24, box.width * 0.3, box.height * 0.3);
}

const DOUBLE_GAP = 4;
const DOUBLE_GAP_PER_STROKE = 1.5;

function doubleGap(box: Bounds, strokeWidth: number): number {
  return Math.min(DOUBLE_GAP + strokeWidth * DOUBLE_GAP_PER_STROKE, box.width / 4, box.height / 4);
}

function insetBox(box: Bounds, inset: number): Bounds {
  return {
    x: box.x + inset,
    y: box.y + inset,
    width: Math.max(box.width - inset * 2, 0),
    height: Math.max(box.height - inset * 2, 0),
  };
}

function diamondFigure({ x, y, width: w, height: h }: Bounds): PathFigure {
  return polygonFigure([
    { x: x + w / 2, y },
    { x: x + w, y: y + h / 2 },
    { x: x + w / 2, y: y + h },
    { x, y: y + h / 2 },
  ]);
}

function innerDiamondBox(box: Bounds, strokeWidth: number): Bounds {
  const a = box.width / 2;
  const b = box.height / 2;
  const k = Math.hypot(a, b);
  const d = doubleGap(box, strokeWidth);
  const ga = b > 0 ? Math.min((d * k) / b, a) : 0;
  const gb = a > 0 ? Math.min((d * k) / a, b) : 0;
  return { x: box.x + ga, y: box.y + gb, width: box.width - ga * 2, height: box.height - gb * 2 };
}

const ACTOR_LABEL_SHARE = 0.24;

function actorFigureHeight(box: Bounds): number {
  return box.height * (1 - ACTOR_LABEL_SHARE);
}

function actorParts(box: Bounds) {
  const height = actorFigureHeight(box);
  const width = Math.min(box.width, height * 0.6);
  const cx = box.x + box.width / 2;
  const head = height * 0.26;
  return {
    head: { x: cx - head / 2, y: box.y, width: head, height: head },
    neck: { x: cx, y: box.y + head },
    hip: { x: cx, y: box.y + height * 0.62 },
    armsY: box.y + height * 0.4,
    left: cx - width / 2,
    right: cx + width / 2,
    feetY: box.y + height,
  };
}

function packageTab(box: Bounds) {
  return { width: box.width * 0.4, height: Math.min(20, box.height * 0.25) };
}

export const SHAPE_KIND_DEFINITIONS: Record<ShapeKind, ShapeKindDefinition> = {
  terminal: {
    outline: (box) => roundedRectFigure(box, terminalRadius(box)),
    labelArea: (box) => insetX(box, terminalRadius(box) * 0.4),
  },

  parallelogram: {
    outline({ x, y, width: w, height: h }) {
      const s = parallelogramSkew({ x, y, width: w, height: h });
      return polygonFigure([
        { x: x + s, y },
        { x: x + w, y },
        { x: x + w - s, y: y + h },
        { x, y: y + h },
      ]);
    },
    labelArea: (box) => insetX(box, parallelogramSkew(box)),
    connectionPoints: [
      { x: 0.5, y: 0 },
      { x: 1 - PARALLELOGRAM_SKEW / 2, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: PARALLELOGRAM_SKEW / 2, y: 0.5 },
    ],
  },

  document: {
    outline(box) {
      const { x, y, width: w, height: h } = box;
      const a = documentWave(box);
      const base = y + h - a;
      const k = a * WAVE_CONTROL;
      return {
        kind: "path",
        start: { x, y },
        closed: true,
        segments: [
          { kind: "line", to: { x: x + w, y } },
          { kind: "line", to: { x: x + w, y: base } },
          {
            kind: "cubic",
            c1: { x: x + w * 0.83, y: base - k },
            c2: { x: x + w * 0.67, y: base - k },
            to: { x: x + w / 2, y: base },
          },
          {
            kind: "cubic",
            c1: { x: x + w * 0.33, y: base + k },
            c2: { x: x + w * 0.17, y: base + k },
            to: { x, y: base },
          },
        ],
      };
    },
    labelArea: (box) => ({ ...box, height: Math.max(box.height - documentWave(box) * 2, 0) }),
    connectionPoints: [
      { x: 0.5, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 1 - DOCUMENT_WAVE },
      { x: 0, y: 0.5 },
    ],
  },

  cylinder: {
    outline(box) {
      const { x, y, width: w, height: h } = box;
      const ry = cylinderCap(box);
      const cx = x + w / 2;
      return {
        kind: "path",
        start: { x, y: y + ry },
        closed: true,
        segments: [
          quarterArc({ x, y: y + ry }, { x: cx, y }, { x, y }),
          quarterArc({ x: cx, y }, { x: x + w, y: y + ry }, { x: x + w, y }),
          { kind: "line", to: { x: x + w, y: y + h - ry } },
          quarterArc({ x: x + w, y: y + h - ry }, { x: cx, y: y + h }, { x: x + w, y: y + h }),
          quarterArc({ x: cx, y: y + h }, { x, y: y + h - ry }, { x, y: y + h }),
        ],
      };
    },
    details(box) {
      const { x, y, width: w } = box;
      const ry = cylinderCap(box);
      const cx = x + w / 2;
      return [
        {
          kind: "path",
          start: { x, y: y + ry },
          closed: false,
          segments: [
            quarterArc({ x, y: y + ry }, { x: cx, y: y + ry * 2 }, { x, y: y + ry * 2 }),
            quarterArc({ x: cx, y: y + ry * 2 }, { x: x + w, y: y + ry }, { x: x + w, y: y + ry * 2 }),
          ],
        },
      ];
    },
    labelArea(box) {
      const ry = cylinderCap(box);
      return { ...box, y: box.y + ry * 2, height: Math.max(box.height - ry * 3, 0) };
    },
  },

  subprocess: {
    outline: rectFigure,
    details(box) {
      const { x, y, width: w, height: h } = box;
      const d = subprocessBar(box);
      return [
        polylineFigure([{ x: x + d, y }, { x: x + d, y: y + h }]),
        polylineFigure([{ x: x + w - d, y }, { x: x + w - d, y: y + h }]),
      ];
    },
    labelArea: (box) => insetX(box, subprocessBar(box)),
  },

  note: {
    outline(box) {
      const { x, y, width: w, height: h } = box;
      const f = noteFold(box);
      return polygonFigure([
        { x, y },
        { x: x + w - f, y },
        { x: x + w, y: y + f },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ]);
    },
    details(box) {
      const { x, y, width: w } = box;
      const f = noteFold(box);
      return [polylineFigure([{ x: x + w - f, y }, { x: x + w - f, y: y + f }, { x: x + w, y: y + f }])];
    },
    labelArea: (box) => box,
  },

  weakEntity: {
    outline: rectFigure,
    details: (box, strokeWidth) => [rectFigure(insetBox(box, doubleGap(box, strokeWidth)))],
    labelArea: (box, strokeWidth) => insetBox(box, doubleGap(box, strokeWidth)),
  },

  doubleDiamond: {
    outline: diamondFigure,
    details: (box, strokeWidth) => [diamondFigure(innerDiamondBox(box, strokeWidth))],
    labelArea: (box) => centeredArea(box, 0.5, 0.5),
  },

  doubleEllipse: {
    outline: (box) => ({ kind: "ellipse", box }),
    details: (box, strokeWidth) => [{ kind: "ellipse", box: insetBox(box, doubleGap(box, strokeWidth)) }],
    labelArea: (box) => centeredArea(box, Math.SQRT1_2, Math.SQRT1_2),
  },

  actor: {
    outline: (box) => ({ kind: "ellipse", box: actorParts(box).head }),
    details(box) {
      const { neck, hip, armsY, left, right, feetY } = actorParts(box);
      return [
        polylineFigure([neck, hip]),
        polylineFigure([{ x: left, y: armsY }, { x: right, y: armsY }]),
        polylineFigure([{ x: left, y: feetY }, hip, { x: right, y: feetY }]),
      ];
    },
    labelArea(box) {
      const top = box.y + actorFigureHeight(box);
      return { x: box.x, y: top, width: box.width, height: box.y + box.height - top };
    },
    bindToBox: true,
  },

  package: {
    outline(box) {
      const { x, y, width: w, height: h } = box;
      const tab = packageTab(box);
      return polygonFigure([
        { x, y },
        { x: x + tab.width, y },
        { x: x + tab.width, y: y + tab.height },
        { x: x + w, y: y + tab.height },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ]);
    },
    details(box) {
      const tab = packageTab(box);
      return [polylineFigure([{ x: box.x, y: box.y + tab.height }, { x: box.x + tab.width, y: box.y + tab.height }])];
    },
    labelArea(box) {
      const tab = packageTab(box);
      return { ...box, y: box.y + tab.height, height: box.height - tab.height };
    },
    connectionPoints: [
      { x: 0.2, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0, y: 0.5 },
    ],
  },
};
