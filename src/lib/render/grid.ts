import { screenToWorld, type Viewport } from "../viewport";

export const GRID_SIZE = 20;

const MIN_SCREEN_SPACING = 8;
const MAJOR_EVERY = 5;

const MINOR_COLOR = "rgba(0, 0, 0, 0.05)";
const MAJOR_COLOR = "rgba(0, 0, 0, 0.1)";

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  gridSize: number,
  screenWidth: number,
  screenHeight: number,
) {
  const { zoom } = viewport;
  let step = gridSize;
  while (step * zoom < MIN_SCREEN_SPACING) step *= MAJOR_EVERY;

  const topLeft = screenToWorld({ x: 0, y: 0 }, viewport);
  const bottomRight = screenToWorld({ x: screenWidth, y: screenHeight }, viewport);
  const startX = Math.floor(topLeft.x / step) * step;
  const startY = Math.floor(topLeft.y / step) * step;

  const minor = new Path2D();
  const strong = new Path2D();
  for (let i = 0, x = startX; x <= bottomRight.x; x = startX + ++i * step) {
    const path = Math.round(x / step) % MAJOR_EVERY === 0 ? strong : minor;
    path.moveTo(x, topLeft.y);
    path.lineTo(x, bottomRight.y);
  }
  for (let i = 0, y = startY; y <= bottomRight.y; y = startY + ++i * step) {
    const path = Math.round(y / step) % MAJOR_EVERY === 0 ? strong : minor;
    path.moveTo(topLeft.x, y);
    path.lineTo(bottomRight.x, y);
  }

  ctx.save();
  ctx.lineWidth = 1 / zoom;
  ctx.strokeStyle = MINOR_COLOR;
  ctx.stroke(minor);
  ctx.strokeStyle = MAJOR_COLOR;
  ctx.stroke(strong);
  ctx.restore();
}
