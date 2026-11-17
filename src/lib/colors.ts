import type { ColorScheme } from "./theme";

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const DARK_LIGHTNESS = { min: 0.12, max: 0.94 };

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function parseHex(color: string): [number, number, number] | null {
  const match = HEX_PATTERN.exec(color.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join("") : match[1];
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function toHsl([r, g, b]: [number, number, number]): Hsl {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l };
  const s = delta / (1 - Math.abs(2 * l - 1));
  const h =
    max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: h * 60, s, l };
}

function toHex({ h, s, l }: Hsl): string {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - chroma / 2;
  const sector = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][sector];
  return `#${[r, g, b]
    .map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

const darkColors = new Map<string, string>();

function toDarkColor(color: string): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const hsl = toHsl(rgb);
  const l = DARK_LIGHTNESS.max - hsl.l * (DARK_LIGHTNESS.max - DARK_LIGHTNESS.min);
  return toHex({ ...hsl, l });
}

export function adaptColor(color: string, scheme: ColorScheme): string {
  if (scheme === "light") return color;
  let adapted = darkColors.get(color);
  if (adapted === undefined) {
    adapted = toDarkColor(color);
    darkColors.set(color, adapted);
  }
  return adapted;
}
