/** Fonte manuscrita carregada no index.html. */
export const FONT_FAMILY = '"Caveat", cursive';
export const DEFAULT_FONT_SIZE = 28;
export const LINE_HEIGHT = 1.25;
/** Tamanho da fonte do rótulo dentro das formas. */
export const LABEL_FONT_SIZE = 20;

export function fontString(fontSize: number): string {
  return `${fontSize}px ${FONT_FAMILY}`;
}

let measureCtx: CanvasRenderingContext2D | null = null;

/** Mede linhas avulsas na fonte do tamanho dado. */
function lineMeasurer(fontSize: number): (line: string) => number {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = measureCtx;
  if (!ctx) return () => 0;
  ctx.font = fontString(fontSize);
  return (line) => ctx.measureText(line).width;
}

/** Largura da linha mais longa e altura total das linhas. */
function measureLines(lines: string[], fontSize: number) {
  const measure = lineMeasurer(fontSize);
  const width = Math.max(0, ...lines.map(measure));
  return { width, height: lines.length * fontSize * LINE_HEIGHT };
}

/** Largura da linha mais longa e altura total do texto, em unidades de mundo. */
export function measureText(text: string, fontSize: number) {
  return measureLines(text.split("\n"), fontSize);
}

/**
 * Quebra o texto em linhas de até `maxWidth`, imitando o `<textarea>` com
 * `white-space: pre-wrap` e `overflow-wrap: break-word` (o `TextEditor`), para
 * o canvas e o editor quebrarem no mesmo lugar:
 * - quebra nos espaços, e o espaço da quebra não ocupa a linha;
 * - uma palavra maior que a linha é quebrada entre letras;
 * - `\n` sempre quebra.
 */
export function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  const measure = lineMeasurer(fontSize);
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    let line = "";
    const words = paragraph.split(" ");
    words.forEach((word, i) => {
      const candidate = i === 0 ? word : `${line} ${word}`;
      if (i === 0 || measure(candidate) <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
      // Palavra maior que a linha: quebra entre letras.
      while (measure(line) > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && measure(line.slice(0, cut)) > maxWidth) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    });
    lines.push(line);
  }
  return lines;
}

/** Linhas já quebradas e o tamanho que ocupam, em unidades de mundo. */
export function layoutText(text: string, fontSize: number, maxWidth: number) {
  const lines = wrapText(text, fontSize, maxWidth);
  return { lines, ...measureLines(lines, fontSize) };
}
