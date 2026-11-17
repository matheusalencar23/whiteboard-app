import type { Point } from "../../types";
import type { Bounds } from "../../geometry/bounds";
import {
  polygonFigure,
  polylineFigure,
  quarterArc,
  roundedRectFigure,
  sampleFigure,
  type Figure,
  type PathFigure,
  type PathSegment,
} from "../../geometry/figure";
import type { ShapeKind } from "../types";
import { centeredArea } from "../shapeUtil";

export type DetailFill = "stroke" | "shape";

export type ShapeDetail = Figure & { fill?: DetailFill };

export interface ShapeKindDefinition {
  outline(box: Bounds): Figure;
  details?(box: Bounds, strokeWidth: number): ShapeDetail[];
  labelArea(box: Bounds, strokeWidth: number): Bounds;
  connectionPoints?: readonly Point[];
  bindToBox?: boolean;
  solid?: boolean;
  labelRotation?: number;
}

const CONTAINER_BAND = 48;

const GROUP_BAND = 40;

function titleBand(length: number, band: number): number {
  return Math.min(band, length / 2);
}

export function laneHorizontalBand(box: Bounds): Bounds {
  return { ...box, width: titleBand(box.width, CONTAINER_BAND) };
}

function topBand(box: Bounds, band: number): Bounds {
  return { ...box, height: titleBand(box.height, band) };
}

const GATEWAY_MARK = 0.36;

const GATEWAY_CIRCLE = 0.44;

function gatewayMark(box: Bounds, share: number): Bounds {
  const size = Math.min(box.width, box.height) * share;
  return { x: box.x + (box.width - size) / 2, y: box.y + (box.height - size) / 2, width: size, height: size };
}

function groupRadius(box: Bounds): number {
  return Math.min(8, box.width * 0.05, box.height * 0.05);
}

const PARALLELOGRAM_SKEW = 0.2;

const DOCUMENT_WAVE = 0.1;

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

function waveSegments(right: number, left: number, base: number, amplitude: number): PathSegment[] {
  const w = right - left;
  const k = amplitude * WAVE_CONTROL;
  return [
    {
      kind: "cubic",
      c1: { x: left + w * 0.83, y: base - k },
      c2: { x: left + w * 0.67, y: base - k },
      to: { x: left + w / 2, y: base },
    },
    {
      kind: "cubic",
      c1: { x: left + w * 0.33, y: base + k },
      c2: { x: left + w * 0.17, y: base + k },
      to: { x: left, y: base },
    },
  ];
}

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

function fractionPolygon(box: Bounds, points: readonly Point[]): PathFigure {
  return polygonFigure(points.map((p) => ({ x: box.x + box.width * p.x, y: box.y + box.height * p.y })));
}

function fractionBox(box: Bounds, area: Bounds): Bounds {
  return {
    x: box.x + box.width * area.x,
    y: box.y + box.height * area.y,
    width: box.width * area.width,
    height: box.height * area.height,
  };
}

function normalizeFigure(figure: PathFigure): PathFigure {
  const samples = sampleFigure(figure);
  const xs = samples.map((p) => p.x);
  const ys = samples.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX || 1;
  const height = Math.max(...ys) - minY || 1;
  const map = (p: Point): Point => ({ x: (p.x - minX) / width, y: (p.y - minY) / height });
  return mapFigure(figure, map);
}

function mapFigure(figure: PathFigure, map: (p: Point) => Point): PathFigure {
  const segments: PathSegment[] = figure.segments.map((segment) =>
    segment.kind === "line"
      ? { kind: "line", to: map(segment.to) }
      : { kind: "cubic", c1: map(segment.c1), c2: map(segment.c2), to: map(segment.to) },
  );
  return { ...figure, start: map(figure.start), segments };
}

function fitFigure(unit: PathFigure, box: Bounds): PathFigure {
  return mapFigure(unit, (p) => ({ x: box.x + box.width * p.x, y: box.y + box.height * p.y }));
}

const STAR_POINTS = 5;
const STAR_INNER_RATIO = 0.382;

function starPolygon(): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < STAR_POINTS * 2; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / STAR_POINTS;
    const radius = i % 2 === 0 ? 1 : STAR_INNER_RATIO;
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX;
  const height = Math.max(...ys) - minY;
  return points.map((p) => ({ x: (p.x - minX) / width, y: (p.y - minY) / height }));
}

const STAR = starPolygon();

const CLOUD_BUMPS = 8;
const CLOUD_BULGE = 0.6;

function cloudUnitFigure(): PathFigure {
  const step = (Math.PI * 2) / CLOUD_BUMPS;
  const bulge = 1 + CLOUD_BULGE * 2 * Math.sin(step / 2);
  const at = (angle: number, radius: number): Point => ({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  const segments: PathSegment[] = [];
  for (let i = 0; i < CLOUD_BUMPS; i++) {
    const from = step * (i - 0.5);
    const to = step * (i + 0.5);
    segments.push({ kind: "cubic", c1: at(from, bulge), c2: at(to, bulge), to: at(to, 1) });
  }
  return normalizeFigure({ kind: "path", start: at(-step / 2, 1), segments, closed: true });
}

const CLOUD = cloudUnitFigure();

const THOUGHT_CLOUD_SHARE = 0.74;

const THOUGHT_BUBBLES: readonly Bounds[] = [
  { x: 0.17, y: 0.785, width: 0.12, height: 0.095 },
  { x: 0.07, y: 0.93, width: 0.07, height: 0.07 },
];

function thoughtCloudBox(box: Bounds): Bounds {
  return { ...box, height: box.height * THOUGHT_CLOUD_SHARE };
}

const SPEECH_TAIL = 0.22;

const SPEECH_TAIL_BASE = { left: 0.22, right: 0.4, tip: 0.14 };

function speechBodyBox(box: Bounds): Bounds {
  return { ...box, height: box.height * (1 - SPEECH_TAIL) };
}

function speechBubbleFigure(box: Bounds): PathFigure {
  const { x, y, width: w } = box;
  const h = speechBodyBox(box).height;
  const r = Math.min(16, w * SPEECH_TAIL_BASE.left * 0.9, h / 2);
  const bottom = y + h;
  return {
    kind: "path",
    start: { x: x + r, y },
    closed: true,
    segments: [
      { kind: "line", to: { x: x + w - r, y } },
      quarterArc({ x: x + w - r, y }, { x: x + w, y: y + r }, { x: x + w, y }),
      { kind: "line", to: { x: x + w, y: bottom - r } },
      quarterArc({ x: x + w, y: bottom - r }, { x: x + w - r, y: bottom }, { x: x + w, y: bottom }),
      { kind: "line", to: { x: x + w * SPEECH_TAIL_BASE.right, y: bottom } },
      { kind: "line", to: { x: x + w * SPEECH_TAIL_BASE.tip, y: box.y + box.height } },
      { kind: "line", to: { x: x + w * SPEECH_TAIL_BASE.left, y: bottom } },
      { kind: "line", to: { x: x + r, y: bottom } },
      quarterArc({ x: x + r, y: bottom }, { x, y: bottom - r }, { x, y: bottom }),
      { kind: "line", to: { x, y: y + r } },
      quarterArc({ x, y: y + r }, { x: x + r, y }, { x, y }),
    ],
  };
}

function braceFigure({ x, y, width: w, height: h }: Bounds): PathFigure {
  const q = Math.min(w / 2, h / 4);
  const mx = x + w / 2;
  const cy = y + h / 2;
  return {
    kind: "path",
    start: { x: x + w, y },
    closed: false,
    segments: [
      quarterArc({ x: x + w, y }, { x: mx, y: y + q }, { x: mx, y }),
      { kind: "line", to: { x: mx, y: cy - q } },
      quarterArc({ x: mx, y: cy - q }, { x, y: cy }, { x: mx, y: cy }),
      quarterArc({ x, y: cy }, { x: mx, y: cy + q }, { x: mx, y: cy }),
      { kind: "line", to: { x: mx, y: y + h - q } },
      quarterArc({ x: mx, y: y + h - q }, { x: x + w, y: y + h }, { x: mx, y: y + h }),
    ],
  };
}

const HEXAGON_INSET = 0.2;
const OCTAGON_CORNER = 0.29;
const TRAPEZOID_INSET = 0.2;
const PENTAGON_SHOULDER = 0.38;
const PENTAGON_FOOT = 0.19;
const BLOCK_ARROW_SHAFT = 0.5;

function blockArrowHead(box: Bounds, share: number): number {
  return Math.min(box.height * 0.6, box.width * share);
}

function blockArrowFigure(box: Bounds, double: boolean): PathFigure {
  const { x, y, width: w, height: h } = box;
  const head = blockArrowHead(box, double ? 0.3 : 0.45);
  const top = y + (h * (1 - BLOCK_ARROW_SHAFT)) / 2;
  const bottom = y + h - (h * (1 - BLOCK_ARROW_SHAFT)) / 2;
  const cy = y + h / 2;
  const right = x + w - head;
  if (!double) {
    return polygonFigure([
      { x, y: top },
      { x: right, y: top },
      { x: right, y },
      { x: x + w, y: cy },
      { x: right, y: y + h },
      { x: right, y: bottom },
      { x, y: bottom },
    ]);
  }
  const left = x + head;
  return polygonFigure([
    { x, y: cy },
    { x: left, y },
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y },
    { x: x + w, y: cy },
    { x: right, y: y + h },
    { x: right, y: bottom },
    { x: left, y: bottom },
    { x: left, y: y + h },
  ]);
}

function blockArrowLabelArea(box: Bounds, inset: { left: number; right: number }): Bounds {
  const top = box.y + (box.height * (1 - BLOCK_ARROW_SHAFT)) / 2;
  return {
    x: box.x + inset.left,
    y: top,
    width: Math.max(box.width - inset.left - inset.right, 0),
    height: box.height * BLOCK_ARROW_SHAFT,
  };
}

function cubeDepth(box: Bounds): number {
  return Math.min(box.width, box.height) * 0.2;
}

const BLOCK_ARROW_POINTS: readonly Point[] = [
  { x: 0.5, y: (1 - BLOCK_ARROW_SHAFT) / 2 },
  { x: 1, y: 0.5 },
  { x: 0.5, y: 1 - (1 - BLOCK_ARROW_SHAFT) / 2 },
  { x: 0, y: 0.5 },
];

const MULTI_DOCUMENT_OFFSET = { x: 0.05, y: 0.07 };

function multiDocumentParts(box: Bounds) {
  const ox = box.width * MULTI_DOCUMENT_OFFSET.x;
  const oy = box.height * MULTI_DOCUMENT_OFFSET.y;
  const front = { x: box.x, y: box.y + oy * 2, width: box.width - ox * 2, height: box.height - oy * 2 };
  return { ox, oy, front, wave: documentWave(front) };
}

const MULTI_DOCUMENT_FRONT_WIDTH = 1 - MULTI_DOCUMENT_OFFSET.x * 2;
const MULTI_DOCUMENT_FRONT_HEIGHT = 1 - MULTI_DOCUMENT_OFFSET.y * 2;

function delayRadius(box: Bounds): number {
  return Math.min(box.width / 2, box.height / 2);
}

const MANUAL_INPUT_SLANT = 0.3;
const OFF_PAGE_BODY = 0.6;
const DISPLAY_POINT = 0.15;
const DISPLAY_CURVE = 0.15;

function insetEllipseBox(box: Bounds, share: number): Bounds {
  const inset = Math.min(box.width, box.height) * share;
  return insetBox(box, inset);
}

function componentIcon(box: Bounds) {
  const height = Math.min(20, box.height * 0.3);
  const width = height * 0.8;
  const margin = Math.min(8, box.height * 0.1, box.width * 0.1);
  const body = { x: box.x + box.width - margin - width, y: box.y + margin, width, height };
  const tab = { width: width * 0.5, height: height * 0.18 };
  const tabX = body.x - tab.width / 2;
  return {
    body,
    margin,
    tabs: [
      { x: tabX, y: body.y + height * 0.2, ...tab },
      { x: tabX, y: body.y + height * 0.62, ...tab },
    ],
  };
}

const CAPTION_SHARE = 0.24;

function captionFigureHeight(box: Bounds): number {
  return box.height * (1 - CAPTION_SHARE);
}

function captionArea(box: Bounds): Bounds {
  const top = box.y + captionFigureHeight(box);
  return { x: box.x, y: top, width: box.width, height: box.y + box.height - top };
}

function serverParts(box: Bounds) {
  const height = captionFigureHeight(box);
  const width = Math.min(box.width, height * 0.62);
  const body = { x: box.x + (box.width - width) / 2, y: box.y, width, height };
  const bay = height / 3;
  const led = Math.min(bay * 0.22, width * 0.12);
  return { body, bay, led };
}

function queueCap(box: Bounds): number {
  return Math.min(box.width * 0.12, box.height * 0.25);
}

const MONITOR_SCREEN = 0.8;

function monitorScreen(box: Bounds): Bounds {
  return { ...box, height: box.height * MONITOR_SCREEN };
}

function mobileParts(box: Bounds) {
  const radius = Math.min(box.width, box.height) * 0.12;
  const sideMargin = box.width * 0.07;
  const topMargin = box.height * 0.1;
  const screen = {
    x: box.x + sideMargin,
    y: box.y + topMargin,
    width: box.width - sideMargin * 2,
    height: box.height - topMargin * 2,
  };
  const button = Math.min(topMargin * 0.5, box.width * 0.18);
  return { radius, screen, topMargin, button };
}

const PERSON_HEAD_GAP = 0.1;

function personParts(box: Bounds) {
  const head = Math.min(box.width * 0.45, box.height * 0.32);
  const bodyTop = box.y + head * (1 + PERSON_HEAD_GAP);
  const body = { x: box.x, y: bodyTop, width: box.width, height: box.y + box.height - bodyTop };
  return {
    head: { x: box.x + (box.width - head) / 2, y: box.y, width: head, height: head },
    body,
    radius: Math.min(box.width * 0.42, body.height * 0.5),
  };
}

function browserBar(box: Bounds): number {
  return Math.min(36, box.height * 0.25);
}

const LANE_HORIZONTAL: ShapeKindDefinition = {
  outline: rectFigure,
  details(box) {
    const band = laneHorizontalBand(box);
    const x = band.x + band.width;
    return [polylineFigure([{ x, y: box.y }, { x, y: box.y + box.height }])];
  },
  labelArea: laneHorizontalBand,
  labelRotation: -Math.PI / 2,
};

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
      return {
        kind: "path",
        start: { x, y },
        closed: true,
        segments: [
          { kind: "line", to: { x: x + w, y } },
          { kind: "line", to: { x: x + w, y: base } },
          ...waveSegments(x + w, x, base, a),
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
  triangle: {
    outline: (box) => fractionPolygon(box, [{ x: 0.5, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]),
    labelArea: (box) => fractionBox(box, { x: 0.25, y: 0.45, width: 0.5, height: 0.5 }),
    connectionPoints: [
      { x: 0.5, y: 0 },
      { x: 0.75, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0.25, y: 0.5 },
    ],
  },

  pentagon: {
    outline: (box) =>
      fractionPolygon(box, [
        { x: 0.5, y: 0 },
        { x: 1, y: PENTAGON_SHOULDER },
        { x: 1 - PENTAGON_FOOT, y: 1 },
        { x: PENTAGON_FOOT, y: 1 },
        { x: 0, y: PENTAGON_SHOULDER },
      ]),
    labelArea: (box) => fractionBox(box, { x: 0.2, y: 0.3, width: 0.6, height: 0.65 }),
    connectionPoints: [
      { x: 0.5, y: 0 },
      { x: 1, y: PENTAGON_SHOULDER },
      { x: 0.5, y: 1 },
      { x: 0, y: PENTAGON_SHOULDER },
    ],
  },

  hexagon: {
    outline: (box) =>
      fractionPolygon(box, [
        { x: HEXAGON_INSET, y: 0 },
        { x: 1 - HEXAGON_INSET, y: 0 },
        { x: 1, y: 0.5 },
        { x: 1 - HEXAGON_INSET, y: 1 },
        { x: HEXAGON_INSET, y: 1 },
        { x: 0, y: 0.5 },
      ]),
    labelArea: (box) => insetX(box, box.width * HEXAGON_INSET * 0.6),
  },

  octagon: {
    outline: (box) =>
      fractionPolygon(box, [
        { x: OCTAGON_CORNER, y: 0 },
        { x: 1 - OCTAGON_CORNER, y: 0 },
        { x: 1, y: OCTAGON_CORNER },
        { x: 1, y: 1 - OCTAGON_CORNER },
        { x: 1 - OCTAGON_CORNER, y: 1 },
        { x: OCTAGON_CORNER, y: 1 },
        { x: 0, y: 1 - OCTAGON_CORNER },
        { x: 0, y: OCTAGON_CORNER },
      ]),
    labelArea: (box) => centeredArea(box, 0.85, 0.75),
  },

  trapezoid: {
    outline: (box) =>
      fractionPolygon(box, [
        { x: TRAPEZOID_INSET, y: 0 },
        { x: 1 - TRAPEZOID_INSET, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ]),
    labelArea: (box) => insetX(box, box.width * TRAPEZOID_INSET * 0.75),
    connectionPoints: [
      { x: 0.5, y: 0 },
      { x: 1 - TRAPEZOID_INSET / 2, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: TRAPEZOID_INSET / 2, y: 0.5 },
    ],
  },

  star: {
    outline: (box) => fractionPolygon(box, STAR),
    labelArea: (box) => fractionBox(box, { x: 0.3, y: 0.35, width: 0.4, height: 0.4 }),
    connectionPoints: STAR.filter((_, i) => i % 2 === 0),
  },

  cross: {
    outline: (box) => {
      const a = 1 / 3;
      const b = 2 / 3;
      return fractionPolygon(box, [
        { x: a, y: 0 },
        { x: b, y: 0 },
        { x: b, y: a },
        { x: 1, y: a },
        { x: 1, y: b },
        { x: b, y: b },
        { x: b, y: 1 },
        { x: a, y: 1 },
        { x: a, y: b },
        { x: 0, y: b },
        { x: 0, y: a },
        { x: a, y: a },
      ]);
    },
    labelArea: (box) => fractionBox(box, { x: 0, y: 1 / 3, width: 1, height: 1 / 3 }),
  },

  blockArrow: {
    outline: (box) => blockArrowFigure(box, false),
    labelArea: (box) => blockArrowLabelArea(box, { left: 0, right: blockArrowHead(box, 0.45) / 2 }),
    connectionPoints: BLOCK_ARROW_POINTS,
  },

  doubleBlockArrow: {
    outline: (box) => blockArrowFigure(box, true),
    labelArea(box) {
      const inset = blockArrowHead(box, 0.3) / 2;
      return blockArrowLabelArea(box, { left: inset, right: inset });
    },
    connectionPoints: BLOCK_ARROW_POINTS,
  },

  cube: {
    outline(box) {
      const { x, y, width: w, height: h } = box;
      const d = cubeDepth(box);
      return polygonFigure([
        { x, y: y + d },
        { x: x + d, y },
        { x: x + w, y },
        { x: x + w, y: y + h - d },
        { x: x + w - d, y: y + h },
        { x, y: y + h },
      ]);
    },
    details(box) {
      const { x, y, width: w, height: h } = box;
      const d = cubeDepth(box);
      return [
        polylineFigure([{ x, y: y + d }, { x: x + w - d, y: y + d }, { x: x + w, y }]),
        polylineFigure([{ x: x + w - d, y: y + d }, { x: x + w - d, y: y + h }]),
      ];
    },
    labelArea(box) {
      const d = cubeDepth(box);
      return { x: box.x, y: box.y + d, width: box.width - d, height: box.height - d };
    },
  },

  speechBubble: {
    outline: speechBubbleFigure,
    labelArea: (box) => insetX(speechBodyBox(box), 4),
    connectionPoints: [
      { x: 0.5, y: 0 },
      { x: 1, y: (1 - SPEECH_TAIL) / 2 },
      { x: 0.5, y: 1 - SPEECH_TAIL },
      { x: 0, y: (1 - SPEECH_TAIL) / 2 },
    ],
  },

  cloud: {
    outline: (box) => fitFigure(CLOUD, box),
    labelArea: (box) => centeredArea(box, 0.62, 0.6),
  },

  thoughtBubble: {
    outline: (box) => fitFigure(CLOUD, thoughtCloudBox(box)),
    details: (box) => THOUGHT_BUBBLES.map((area) => ({ kind: "ellipse", box: fractionBox(box, area), fill: "shape" })),
    labelArea: (box) => centeredArea(thoughtCloudBox(box), 0.62, 0.6),
    connectionPoints: [
      { x: 0.5, y: 0 },
      { x: 1, y: THOUGHT_CLOUD_SHARE / 2 },
      { x: 0.5, y: THOUGHT_CLOUD_SHARE },
      { x: 0, y: THOUGHT_CLOUD_SHARE / 2 },
    ],
  },

  brace: {
    outline: braceFigure,
    labelArea: (box) => box,
    bindToBox: true,
  },
  multiDocument: {
    outline(box) {
      const { x, y, width: w, height: h } = box;
      const { ox, oy, front, wave } = multiDocumentParts(box);
      const backBottom = y + h - oy * 2 - wave;
      const middleBottom = y + h - oy - wave;
      const frontRight = front.x + front.width;
      return {
        kind: "path",
        start: { x, y: y + oy * 2 },
        closed: true,
        segments: [
          { kind: "line", to: { x: x + ox, y: y + oy * 2 } },
          { kind: "line", to: { x: x + ox, y: y + oy } },
          { kind: "line", to: { x: x + ox * 2, y: y + oy } },
          { kind: "line", to: { x: x + ox * 2, y } },
          { kind: "line", to: { x: x + w, y } },
          { kind: "line", to: { x: x + w, y: backBottom } },
          { kind: "line", to: { x: x + w - ox, y: backBottom } },
          { kind: "line", to: { x: x + w - ox, y: middleBottom } },
          { kind: "line", to: { x: frontRight, y: middleBottom } },
          { kind: "line", to: { x: frontRight, y: y + h - wave } },
          ...waveSegments(frontRight, x, y + h - wave, wave),
        ],
      };
    },
    details(box) {
      const { x, y, width: w, height: h } = box;
      const { ox, oy, front, wave } = multiDocumentParts(box);
      const frontRight = front.x + front.width;
      return [
        polylineFigure([
          { x: x + ox, y: front.y },
          { x: frontRight, y: front.y },
          { x: frontRight, y: y + h - oy - wave },
        ]),
        polylineFigure([
          { x: x + ox * 2, y: y + oy },
          { x: x + w - ox, y: y + oy },
          { x: x + w - ox, y: y + h - oy * 2 - wave },
        ]),
      ];
    },
    labelArea(box) {
      const { front, wave } = multiDocumentParts(box);
      return { ...front, height: Math.max(front.height - wave * 2, 0) };
    },
    connectionPoints: [
      { x: 0.5, y: 0 },
      { x: 1, y: 0.5 },
      { x: MULTI_DOCUMENT_FRONT_WIDTH / 2, y: 1 - MULTI_DOCUMENT_FRONT_HEIGHT * DOCUMENT_WAVE },
      { x: 0, y: 0.5 },
    ],
  },

  delay: {
    outline(box) {
      const { x, y, width: w, height: h } = box;
      const r = delayRadius(box);
      const cy = y + h / 2;
      return {
        kind: "path",
        start: { x, y },
        closed: true,
        segments: [
          { kind: "line", to: { x: x + w - r, y } },
          quarterArc({ x: x + w - r, y }, { x: x + w, y: cy }, { x: x + w, y }),
          quarterArc({ x: x + w, y: cy }, { x: x + w - r, y: y + h }, { x: x + w, y: y + h }),
          { kind: "line", to: { x, y: y + h } },
        ],
      };
    },
    labelArea: (box) => ({ ...box, width: Math.max(box.width - delayRadius(box) * 0.4, 0) }),
  },

  manualInput: {
    outline: (box) =>
      fractionPolygon(box, [
        { x: 0, y: MANUAL_INPUT_SLANT },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ]),
    labelArea: (box) => fractionBox(box, { x: 0, y: MANUAL_INPUT_SLANT, width: 1, height: 1 - MANUAL_INPUT_SLANT }),
    connectionPoints: [
      { x: 0.5, y: MANUAL_INPUT_SLANT / 2 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0, y: 0.5 + MANUAL_INPUT_SLANT / 2 },
    ],
  },

  offPageConnector: {
    outline: (box) =>
      fractionPolygon(box, [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: OFF_PAGE_BODY },
        { x: 0.5, y: 1 },
        { x: 0, y: OFF_PAGE_BODY },
      ]),
    labelArea: (box) => fractionBox(box, { x: 0, y: 0, width: 1, height: OFF_PAGE_BODY }),
    connectionPoints: [
      { x: 0.5, y: 0 },
      { x: 1, y: OFF_PAGE_BODY / 2 },
      { x: 0.5, y: 1 },
      { x: 0, y: OFF_PAGE_BODY / 2 },
    ],
  },

  display: {
    outline(box) {
      const { x, y, width: w, height: h } = box;
      const point = w * DISPLAY_POINT;
      const curve = w * DISPLAY_CURVE;
      const cy = y + h / 2;
      return {
        kind: "path",
        start: { x, y: cy },
        closed: true,
        segments: [
          { kind: "line", to: { x: x + point, y } },
          { kind: "line", to: { x: x + w - curve, y } },
          quarterArc({ x: x + w - curve, y }, { x: x + w, y: cy }, { x: x + w, y }),
          quarterArc({ x: x + w, y: cy }, { x: x + w - curve, y: y + h }, { x: x + w, y: y + h }),
          { kind: "line", to: { x: x + point, y: y + h } },
        ],
      };
    },
    labelArea: (box) => insetX(box, box.width * DISPLAY_POINT * 0.75),
  },

  initialState: {
    outline: (box) => ({ kind: "ellipse", box }),
    labelArea: (box) => box,
    solid: true,
  },

  finalState: {
    outline: (box) => ({ kind: "ellipse", box }),
    details: (box) => [{ kind: "ellipse", box: insetEllipseBox(box, 0.22), fill: "stroke" }],
    labelArea: (box) => box,
  },

  flowFinal: {
    outline: (box) => ({ kind: "ellipse", box }),
    details(box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const dx = (box.width / 2) * Math.SQRT1_2;
      const dy = (box.height / 2) * Math.SQRT1_2;
      return [
        polylineFigure([{ x: cx - dx, y: cy - dy }, { x: cx + dx, y: cy + dy }]),
        polylineFigure([{ x: cx + dx, y: cy - dy }, { x: cx - dx, y: cy + dy }]),
      ];
    },
    labelArea: (box) => box,
  },

  bar: {
    outline: rectFigure,
    labelArea: (box) => box,
    solid: true,
    connectionPoints: [
      { x: 0.25, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.75, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.75, y: 1 },
      { x: 0.5, y: 1 },
      { x: 0.25, y: 1 },
      { x: 0, y: 0.5 },
    ],
  },

  component: {
    outline: rectFigure,
    details(box) {
      const { body, tabs } = componentIcon(box);
      return [rectFigure(body), ...tabs.map(rectFigure)];
    },
    labelArea(box) {
      const { body, margin } = componentIcon(box);
      return insetX(box, body.width + margin);
    },
  },
  server: {
    outline: (box) => rectFigure(serverParts(box).body),
    details(box) {
      const { body, bay, led } = serverParts(box);
      const figures: ShapeDetail[] = [];
      for (let i = 0; i < 3; i++) {
        const top = body.y + bay * i;
        const cy = top + bay / 2;
        if (i > 0) figures.push(polylineFigure([{ x: body.x, y: top }, { x: body.x + body.width, y: top }]));
        figures.push(
          polylineFigure([
            { x: body.x + body.width * 0.15, y: cy },
            { x: body.x + body.width * 0.55, y: cy },
          ]),
        );
        figures.push({
          kind: "ellipse",
          box: { x: body.x + body.width * 0.78 - led / 2, y: cy - led / 2, width: led, height: led },
          fill: "stroke",
        });
      }
      return figures;
    },
    labelArea: captionArea,
    bindToBox: true,
  },

  queue: {
    outline(box) {
      const { x, y, width: w, height: h } = box;
      const rx = queueCap(box);
      const cy = y + h / 2;
      return {
        kind: "path",
        start: { x: x + rx, y },
        closed: true,
        segments: [
          { kind: "line", to: { x: x + w - rx, y } },
          quarterArc({ x: x + w - rx, y }, { x: x + w, y: cy }, { x: x + w, y }),
          quarterArc({ x: x + w, y: cy }, { x: x + w - rx, y: y + h }, { x: x + w, y: y + h }),
          { kind: "line", to: { x: x + rx, y: y + h } },
          quarterArc({ x: x + rx, y: y + h }, { x, y: cy }, { x, y: y + h }),
          quarterArc({ x, y: cy }, { x: x + rx, y }, { x, y }),
        ],
      };
    },
    details(box) {
      const { x, y, width: w, height: h } = box;
      const rx = queueCap(box);
      const cy = y + h / 2;
      return [
        {
          kind: "path",
          start: { x: x + w - rx, y },
          closed: false,
          segments: [
            quarterArc({ x: x + w - rx, y }, { x: x + w - rx * 2, y: cy }, { x: x + w - rx * 2, y }),
            quarterArc({ x: x + w - rx * 2, y: cy }, { x: x + w - rx, y: y + h }, { x: x + w - rx * 2, y: y + h }),
          ],
        },
      ];
    },
    labelArea(box) {
      const rx = queueCap(box);
      return { ...box, x: box.x + rx, width: Math.max(box.width - rx * 3, 0) };
    },
  },

  monitor: {
    outline: (box) => roundedRectFigure(monitorScreen(box), Math.min(6, box.width * 0.05)),
    details(box) {
      const screen = monitorScreen(box);
      const cx = box.x + box.width / 2;
      const neck = box.width * 0.06;
      const base = box.width * 0.2;
      const bottom = box.y + box.height;
      const top = screen.y + screen.height;
      return [
        polylineFigure([{ x: cx - neck, y: top }, { x: cx - neck, y: bottom }]),
        polylineFigure([{ x: cx + neck, y: top }, { x: cx + neck, y: bottom }]),
        polylineFigure([{ x: cx - base, y: bottom }, { x: cx + base, y: bottom }]),
      ];
    },
    labelArea: (box) => insetBox(monitorScreen(box), 6),
    bindToBox: true,
  },

  mobile: {
    outline: (box) => roundedRectFigure(box, mobileParts(box).radius),
    details(box) {
      const { screen, topMargin, button } = mobileParts(box);
      const cx = box.x + box.width / 2;
      const speaker = box.width * 0.12;
      return [
        rectFigure(screen),
        polylineFigure([
          { x: cx - speaker, y: box.y + topMargin / 2 },
          { x: cx + speaker, y: box.y + topMargin / 2 },
        ]),
        {
          kind: "ellipse",
          box: { x: cx - button / 2, y: box.y + box.height - topMargin / 2 - button / 2, width: button, height: button },
        },
      ];
    },
    labelArea: (box) => mobileParts(box).screen,
  },

  person: {
    outline(box) {
      const { body, radius } = personParts(box);
      const { x, y, width: w, height: h } = body;
      return {
        kind: "path",
        start: { x, y: y + h },
        closed: true,
        segments: [
          { kind: "line", to: { x, y: y + radius } },
          quarterArc({ x, y: y + radius }, { x: x + radius, y }, { x, y }),
          { kind: "line", to: { x: x + w - radius, y } },
          quarterArc({ x: x + w - radius, y }, { x: x + w, y: y + radius }, { x: x + w, y }),
          { kind: "line", to: { x: x + w, y: y + h } },
        ],
      };
    },
    details: (box) => [{ kind: "ellipse", box: personParts(box).head, fill: "shape" }],
    labelArea(box) {
      const { body, radius } = personParts(box);
      return { ...body, y: body.y + radius * 0.3, height: Math.max(body.height - radius * 0.3, 0) };
    },
    bindToBox: true,
  },

  browserWindow: {
    outline: (box) => roundedRectFigure(box, Math.min(8, box.width * 0.04, box.height * 0.04)),
    details(box) {
      const bar = browserBar(box);
      const dot = Math.min(bar * 0.3, box.width * 0.04);
      const dotY = box.y + bar / 2 - dot / 2;
      const dots: ShapeDetail[] = [0, 1, 2].map((i) => ({
        kind: "ellipse",
        box: { x: box.x + bar * 0.4 + i * dot * 1.7, y: dotY, width: dot, height: dot },
      }));
      const addressLeft = box.x + bar * 0.4 + dot * 5.4;
      const address = {
        x: addressLeft,
        y: box.y + bar * 0.22,
        width: Math.max(box.x + box.width - bar * 0.4 - addressLeft, 0),
        height: bar * 0.56,
      };
      return [
        polylineFigure([{ x: box.x, y: box.y + bar }, { x: box.x + box.width, y: box.y + bar }]),
        ...dots,
        roundedRectFigure(address, address.height / 2),
      ];
    },
    labelArea(box) {
      const bar = browserBar(box);
      return { ...box, y: box.y + bar, height: Math.max(box.height - bar, 0) };
    },
  },

  imagePlaceholder: {
    outline: rectFigure,
    details: ({ x, y, width: w, height: h }) => [
      polylineFigure([{ x, y }, { x: x + w, y: y + h }]),
      polylineFigure([{ x: x + w, y }, { x, y: y + h }]),
    ],
    labelArea: (box) => box,
  },

  checkbox: {
    outline: rectFigure,
    details: (box) => [
      polylineFigure([
        { x: box.x + box.width * 0.22, y: box.y + box.height * 0.52 },
        { x: box.x + box.width * 0.42, y: box.y + box.height * 0.72 },
        { x: box.x + box.width * 0.78, y: box.y + box.height * 0.3 },
      ]),
    ],
    labelArea: (box) => box,
  },

  laneHorizontal: LANE_HORIZONTAL,

  pool: LANE_HORIZONTAL,

  laneVertical: {
    outline: rectFigure,
    details(box) {
      const band = topBand(box, CONTAINER_BAND);
      const y = band.y + band.height;
      return [polylineFigure([{ x: box.x, y }, { x: box.x + box.width, y }])];
    },
    labelArea: (box) => topBand(box, CONTAINER_BAND),
  },

  titledGroup: {
    outline: (box) => roundedRectFigure(box, groupRadius(box)),
    details(box) {
      const band = topBand(box, GROUP_BAND);
      const y = band.y + band.height;
      return [polylineFigure([{ x: box.x, y }, { x: box.x + box.width, y }])];
    },
    labelArea: (box) => insetX(topBand(box, GROUP_BAND), groupRadius(box)),
  },

  gatewayExclusive: {
    outline: diamondFigure,
    details(box) {
      const { x, y, width: w, height: h } = gatewayMark(box, GATEWAY_MARK);
      return [
        polylineFigure([{ x, y }, { x: x + w, y: y + h }]),
        polylineFigure([{ x: x + w, y }, { x, y: y + h }]),
      ];
    },
    labelArea: (box) => centeredArea(box, 0.5, 0.5),
  },

  gatewayParallel: {
    outline: diamondFigure,
    details(box) {
      const { x, y, width: w, height: h } = gatewayMark(box, GATEWAY_CIRCLE);
      return [
        polylineFigure([{ x: x + w / 2, y }, { x: x + w / 2, y: y + h }]),
        polylineFigure([{ x, y: y + h / 2 }, { x: x + w, y: y + h / 2 }]),
      ];
    },
    labelArea: (box) => centeredArea(box, 0.5, 0.5),
  },

  gatewayInclusive: {
    outline: diamondFigure,
    details: (box) => [{ kind: "ellipse", box: gatewayMark(box, GATEWAY_CIRCLE) }],
    labelArea: (box) => centeredArea(box, 0.5, 0.5),
  },
};
