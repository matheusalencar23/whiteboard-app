import { screenToWorld, type Viewport } from "../viewport";
import { theme } from "../theme";

export const GRID_SIZE = 20;

export type GridStyle = "dots" | "lines";

export const GRID_STYLES: GridStyle[] = ["dots", "lines"];

const MIN_SCREEN_SPACING = 10;
const MAJOR_EVERY = 5;
const MINOR_DOT_SIZE = 1.5;
const MAJOR_DOT_SIZE = 2.5;

interface GridArea {
  step: number;
  zoom: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function isMajorLine(value: number, step: number) {
  return Math.round(value / step) % MAJOR_EVERY === 0;
}

function drawDots(ctx: CanvasRenderingContext2D, { step, zoom, startX, startY, endX, endY }: GridArea) {
  const minorSize = MINOR_DOT_SIZE / zoom;
  const majorSize = MAJOR_DOT_SIZE / zoom;
  const minor = new Path2D();
  const major = new Path2D();
  for (let i = 0, x = startX; x <= endX; x = startX + ++i * step) {
    const majorColumn = isMajorLine(x, step);
    for (let j = 0, y = startY; y <= endY; y = startY + ++j * step) {
      const isMajor = majorColumn && isMajorLine(y, step);
      const size = isMajor ? majorSize : minorSize;
      (isMajor ? major : minor).rect(x - size / 2, y - size / 2, size, size);
    }
  }

  ctx.fillStyle = theme.canvas.gridDotMinor;
  ctx.fill(minor);
  ctx.fillStyle = theme.canvas.gridDotMajor;
  ctx.fill(major);
}

function drawLines(ctx: CanvasRenderingContext2D, { step, zoom, startX, startY, endX, endY }: GridArea) {
  const minor = new Path2D();
  const major = new Path2D();
  for (let i = 0, x = startX; x <= endX; x = startX + ++i * step) {
    const path = isMajorLine(x, step) ? major : minor;
    path.moveTo(x, startY);
    path.lineTo(x, endY);
  }
  for (let j = 0, y = startY; y <= endY; y = startY + ++j * step) {
    const path = isMajorLine(y, step) ? major : minor;
    path.moveTo(startX, y);
    path.lineTo(endX, y);
  }

  ctx.lineWidth = 1 / zoom;
  ctx.strokeStyle = theme.canvas.gridLineMinor;
  ctx.stroke(minor);
  ctx.strokeStyle = theme.canvas.gridLineMajor;
  ctx.stroke(major);
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  gridSize: number,
  style: GridStyle,
  screenWidth: number,
  screenHeight: number,
) {
  const { zoom } = viewport;
  let step = gridSize;
  while (step * zoom < MIN_SCREEN_SPACING) step *= MAJOR_EVERY;

  const topLeft = screenToWorld({ x: 0, y: 0 }, viewport);
  const bottomRight = screenToWorld({ x: screenWidth, y: screenHeight }, viewport);
  const area: GridArea = {
    step,
    zoom,
    startX: Math.floor(topLeft.x / step) * step,
    startY: Math.floor(topLeft.y / step) * step,
    endX: bottomRight.x,
    endY: bottomRight.y,
  };

  ctx.save();
  if (style === "dots") drawDots(ctx, area);
  else drawLines(ctx, area);
  ctx.restore();
}
