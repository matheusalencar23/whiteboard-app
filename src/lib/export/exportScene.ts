import rough from "roughjs";
import { expandBounds, unionBounds, type Bounds } from "../geometry/bounds";
import { getElementBounds, renderElement } from "../elements/registry";
import type { BoardElement } from "../elements/types";
import { theme } from "../theme";
import { SvgContext, escapeXml } from "./svgContext";
import { buildFontStyles, collectFontUsage } from "./fonts";

export interface ExportOptions {
  background: boolean;
  scale: number;
}

export const EXPORT_PADDING = 24;
const MAX_CANVAS_AREA = 16_000_000;
const MAX_CANVAS_SIDE = 16_000;

export function getExportBounds(elements: BoardElement[]): Bounds | null {
  if (elements.length === 0) return null;
  const strokes = Math.max(...elements.map((el) => el.style.strokeWidth));
  return expandBounds(unionBounds(elements.map(getElementBounds)), EXPORT_PADDING + strokes);
}

export function getPngSize(bounds: Bounds, scale: number) {
  const fit = Math.min(
    1,
    Math.sqrt(MAX_CANVAS_AREA / (bounds.width * bounds.height * scale * scale)),
    MAX_CANVAS_SIDE / (bounds.width * scale),
    MAX_CANVAS_SIDE / (bounds.height * scale),
  );
  const effective = scale * fit;
  return {
    width: Math.max(1, Math.round(bounds.width * effective)),
    height: Math.max(1, Math.round(bounds.height * effective)),
    scale: effective,
  };
}

export function renderToCanvas(elements: BoardElement[], options: ExportOptions): HTMLCanvasElement | null {
  const bounds = getExportBounds(elements);
  if (!bounds) return null;
  const size = getPngSize(bounds, options.scale);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (options.background) {
    ctx.fillStyle = theme.canvas.exportBackground;
    ctx.fillRect(0, 0, size.width, size.height);
  }
  ctx.setTransform(size.scale, 0, 0, size.scale, -bounds.x * size.scale, -bounds.y * size.scale);
  const rc = rough.canvas(canvas);
  for (const element of elements) renderElement(element, rc, ctx);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG vazio"))), "image/png");
  });
}

export async function renderToSvg(
  elements: BoardElement[],
  options: Pick<ExportOptions, "background">,
): Promise<string | null> {
  const bounds = getExportBounds(elements);
  if (!bounds) return null;
  const svg = new SvgContext();
  svg.translate(-bounds.x, -bounds.y);
  const ctx = svg as unknown as CanvasRenderingContext2D;
  const rc = rough.canvas({ getContext: () => ctx } as unknown as HTMLCanvasElement);
  for (const element of elements) renderElement(element, rc, ctx);

  const fontStyles = await buildFontStyles(collectFontUsage(elements));
  return svg.toSvg(bounds.width, bounds.height, {
    defs: fontStyles ? `<style>${escapeXml(fontStyles)}</style>` : "",
    background: options.background ? theme.canvas.exportBackground : undefined,
  });
}
