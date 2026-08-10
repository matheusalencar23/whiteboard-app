import { getRotatedEnvelope } from "../envelope";
import type { Bounds, Point, TextElement } from "../types";

export const FONT_FAMILY = "Excalifont, 'Segoe Print', sans-serif";
const LINE_HEIGHT_RATIO = 1.25;
const MIN_WIDTH = 4;

let measureCtx: CanvasRenderingContext2D | null = null;

/** Contexto 2D offscreen, reaproveitado só para medir texto (nunca desenhado). */
function getMeasureContext(): CanvasRenderingContext2D {
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d")!;
  }

  return measureCtx;
}

/** Calcula width/height necessários para conter `text` no tamanho de fonte dado. */
export function measureText(
  text: string,
  fontSize: number,
): { width: number; height: number } {
  const ctx = getMeasureContext();
  ctx.font = `${fontSize}px ${FONT_FAMILY}`;

  const lines = text.split("\n");
  const width = Math.max(
    MIN_WIDTH,
    ...lines.map((line) => ctx.measureText(line).width),
  );
  const height = lines.length * fontSize * LINE_HEIGHT_RATIO;

  return { width, height };
}

export function drawText(el: TextElement, ctx: CanvasRenderingContext2D) {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;

  ctx.save();

  if (el.angle !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate((el.angle * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  ctx.font = `${el.fontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = el.stroke;
  ctx.textBaseline = "top";

  const lineHeight = el.fontSize * LINE_HEIGHT_RATIO;

  el.text.split("\n").forEach((line, i) => {
    ctx.fillText(line, el.x, el.y + i * lineHeight);
  });

  ctx.restore();
}

export function textContainsPoint(el: TextElement, point: Point): boolean {
  return (
    point.x >= el.x &&
    point.x <= el.x + el.width &&
    point.y >= el.y &&
    point.y <= el.y + el.height
  );
}

export function getTextGeometry(el: TextElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

export function getTextBounds(el: TextElement): Bounds {
  const geometry = getTextGeometry(el);
  const corners: Point[] = [
    { x: el.x, y: el.y },
    { x: el.x + el.width, y: el.y },
    { x: el.x + el.width, y: el.y + el.height },
    { x: el.x, y: el.y + el.height },
  ];
  return getRotatedEnvelope(corners, geometry, el.angle);
}
