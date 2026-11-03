export const FONT_FAMILY = '"Caveat", cursive';
export const DEFAULT_FONT_SIZE = 28;
export const LINE_HEIGHT = 1.25;
export const LABEL_FONT_SIZE = 20;

export function fontString(fontSize: number): string {
  return `${fontSize}px ${FONT_FAMILY}`;
}

let measureCtx: CanvasRenderingContext2D | null = null;

function lineMeasurer(fontSize: number): (line: string) => number {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = measureCtx;
  if (!ctx) return () => 0;
  ctx.font = fontString(fontSize);
  return (line) => ctx.measureText(line).width;
}

function measureLines(lines: string[], fontSize: number) {
  const measure = lineMeasurer(fontSize);
  const width = Math.max(0, ...lines.map(measure));
  return { width, height: lines.length * fontSize * LINE_HEIGHT };
}

export function measureText(text: string, fontSize: number) {
  return measureLines(text.split("\n"), fontSize);
}

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

export function layoutText(text: string, fontSize: number, maxWidth: number) {
  const lines = wrapText(text, fontSize, maxWidth);
  return { lines, ...measureLines(lines, fontSize) };
}
