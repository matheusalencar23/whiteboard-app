import type { BoardElement, FontFamily } from "../elements/types";

const GOOGLE_FONTS: Record<FontFamily, string> = {
  hand: "Caveat:wght@400;700",
  sans: "IBM Plex Sans:ital,wght@0,400;0,700;1,400;1,700",
  mono: "IBM Plex Mono:ital,wght@0,400;0,700;1,400;1,700",
};

const FONT_URL = /url\((https:\/\/[^)]+)\)/g;

export type FontUsage = Map<FontFamily, Set<string>>;

export function collectFontUsage(elements: BoardElement[]): FontUsage {
  const usage: FontUsage = new Map();
  const add = (family: FontFamily, text: string) => {
    if (text.trim() === "") return;
    const chars = usage.get(family) ?? new Set<string>();
    for (const char of text) chars.add(char);
    usage.set(family, chars);
  };
  for (const el of elements) {
    if (el.type === "text") add(el.textStyle.fontFamily, el.text);
    else if (el.type === "table") el.sections.forEach((section) => add(el.textStyle.fontFamily, section.text));
    else if ("label" in el && el.label) add(el.label.textStyle.fontFamily, el.label.text);
  }
  return usage;
}

function stylesheetUrl(family: FontFamily, text?: string): string {
  const base = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS[family].replace(/ /g, "+")}`;
  return text === undefined ? `${base}&display=swap` : `${base}&text=${encodeURIComponent(text)}`;
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}

async function inlineFamily(family: FontFamily, chars: Set<string>): Promise<string> {
  const css = await (await fetchOk(stylesheetUrl(family, [...chars].join("")))).text();
  const urls = [...new Set(Array.from(css.matchAll(FONT_URL), (match) => match[1]))];
  const dataUrls = await Promise.all(urls.map(async (url) => toDataUrl(await (await fetchOk(url)).blob())));
  return urls.reduce((result, url, i) => result.replaceAll(url, dataUrls[i]), css);
}

export async function buildFontStyles(usage: FontUsage): Promise<string> {
  const imports: string[] = [];
  const faces: string[] = [];
  await Promise.all(
    [...usage].map(async ([family, chars]) => {
      try {
        faces.push(await inlineFamily(family, chars));
      } catch (error) {
        console.warn(`Não foi possível embutir a fonte "${family}" no SVG.`, error);
        imports.push(`@import url("${stylesheetUrl(family)}");`);
      }
    }),
  );
  return [...imports, ...faces].join("\n");
}
