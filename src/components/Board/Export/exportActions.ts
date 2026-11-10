import { downloadBlob, safeFileName } from "../../../lib/boardFile";
import { canvasToBlob, renderToCanvas, renderToSvg, type ExportOptions } from "../../../lib/export/exportScene";
import type { BoardElement } from "../../../lib/elements/types";

export async function downloadPng(elements: BoardElement[], options: ExportOptions, name: string) {
  const canvas = renderToCanvas(elements, options);
  if (!canvas) return;
  downloadBlob(await canvasToBlob(canvas), safeFileName(name, ".png"));
}

export async function downloadSvg(elements: BoardElement[], options: ExportOptions, name: string) {
  const svg = await renderToSvg(elements, options);
  if (!svg) return;
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), safeFileName(name, ".svg"));
}

export async function copyPng(elements: BoardElement[], options: ExportOptions) {
  const canvas = renderToCanvas(elements, options);
  if (!canvas) return;
  await navigator.clipboard.write([new ClipboardItem({ "image/png": canvasToBlob(canvas) })]);
}

export function canCopyImage(): boolean {
  return typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function";
}
