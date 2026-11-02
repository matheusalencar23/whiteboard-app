/** Fonte manuscrita carregada no index.html. */
export const FONT_FAMILY = '"Caveat", cursive';
export const DEFAULT_FONT_SIZE = 28;
export const LINE_HEIGHT = 1.25;

export function fontString(fontSize: number): string {
  return `${fontSize}px ${FONT_FAMILY}`;
}

let measureCtx: CanvasRenderingContext2D | null = null;

/** Largura da linha mais longa e altura total do texto, em unidades de mundo. */
export function measureText(text: string, fontSize: number) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  const lines = text.split("\n");
  let width = 0;
  if (measureCtx) {
    measureCtx.font = fontString(fontSize);
    for (const line of lines) {
      width = Math.max(width, measureCtx.measureText(line).width);
    }
  }
  return { width, height: lines.length * fontSize * LINE_HEIGHT };
}
