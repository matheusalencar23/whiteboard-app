import { getCenter, type Bounds } from "../geometry/bounds";
import { rotatePoint } from "../geometry/distance";
import { padFrame, type SelectionFrame } from "../selection";
import { theme } from "../theme";
import type { Point } from "../types";

export type Measurement =
  | { kind: "angle"; degrees: number; at: Point }
  | { kind: "size"; width: number; height: number };

const FONT_SIZE = 12;
const PADDING_X = 8;
const PILL_HEIGHT = 22;
const FRAME_GAP = 10;
const CURSOR_OFFSET = { x: 18, y: 18 };

export function toDegrees(radians: number): number {
  const degrees = Math.round((radians * 180) / Math.PI) % 360;
  return degrees < 0 ? degrees + 360 : degrees;
}

function measurementText(measurement: Measurement): string {
  if (measurement.kind === "angle") return `${measurement.degrees}°`;
  return `${Math.round(measurement.width)} × ${Math.round(measurement.height)}`;
}

function lowestFramePoint(frame: SelectionFrame, zoom: number): Point {
  const box = padFrame(frame.box, zoom);
  const center = getCenter(box);
  const corners: Point[] = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ].map((p) => rotatePoint(p, center, frame.rotation));
  return { x: center.x, y: Math.max(...corners.map((p) => p.y)) };
}

function pillBounds(measurement: Measurement, frame: SelectionFrame | null, width: number, zoom: number): Bounds | null {
  const height = PILL_HEIGHT / zoom;
  if (measurement.kind === "angle") {
    return {
      x: measurement.at.x + CURSOR_OFFSET.x / zoom,
      y: measurement.at.y + CURSOR_OFFSET.y / zoom,
      width,
      height,
    };
  }
  if (!frame) return null;
  const bottom = lowestFramePoint(frame, zoom);
  return { x: bottom.x - width / 2, y: bottom.y + FRAME_GAP / zoom, width, height };
}

export function renderMeasurement(
  ctx: CanvasRenderingContext2D,
  measurement: Measurement,
  frame: SelectionFrame | null,
  zoom: number,
) {
  const text = measurementText(measurement);
  ctx.save();
  ctx.font = `500 ${FONT_SIZE / zoom}px ${theme.font.mono}`;
  const width = ctx.measureText(text).width + (PADDING_X * 2) / zoom;
  const pill = pillBounds(measurement, frame, width, zoom);
  if (pill) {
    ctx.beginPath();
    ctx.roundRect(pill.x, pill.y, pill.width, pill.height, pill.height / 2);
    ctx.fillStyle = theme.canvas.measurementFill;
    ctx.fill();
    ctx.fillStyle = theme.canvas.measurementText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const center = getCenter(pill);
    ctx.fillText(text, center.x, center.y);
  }
  ctx.restore();
}
