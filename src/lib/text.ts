import { theme } from "./theme";
import type { FontFamily, TextStyle } from "./elements/types";

export const LINE_HEIGHT = 1.25;

export const FONT_SIZE_PRESETS = [16, 24, 32, 48] as const;

export const FONT_STACKS: Record<FontFamily, string> = {
  hand: theme.font.hand,
  sans: theme.font.ui,
  mono: theme.font.mono,
};

export type FontSpec = Pick<TextStyle, "fontFamily" | "fontSize" | "bold" | "italic">;

export function fontString(font: FontSpec): string {
  const style = font.italic ? "italic" : "normal";
  const weight = font.bold ? 700 : 400;
  return `${style} ${weight} ${font.fontSize}px ${FONT_STACKS[font.fontFamily]}`;
}

export function lineHeight(font: FontSpec): number {
  return font.fontSize * LINE_HEIGHT;
}

let measureCtx: CanvasRenderingContext2D | null = null;

function lineMeasurer(font: FontSpec): (line: string) => number {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = measureCtx;
  if (!ctx) return () => 0;
  ctx.font = fontString(font);
  return (line) => ctx.measureText(line).width;
}

export function measureLineWidths(lines: string[], font: FontSpec): number[] {
  return lines.map(lineMeasurer(font));
}

function measureLines(lines: string[], font: FontSpec) {
  const width = Math.max(0, ...measureLineWidths(lines, font));
  return { width, height: lines.length * lineHeight(font) };
}

export function measureText(text: string, font: FontSpec) {
  return measureLines(text.split("\n"), font);
}

export function wrapText(text: string, font: FontSpec, maxWidth: number): string[] {
  const measure = lineMeasurer(font);
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

export function layoutText(text: string, font: FontSpec, maxWidth: number) {
  const lines = wrapText(text, font, maxWidth);
  return { lines, ...measureLines(lines, font) };
}

export function alignedX(align: TextStyle["align"], left: number, width: number): number {
  if (align === "center") return left + width / 2;
  if (align === "right") return left + width;
  return left;
}
