import { useEffect, useSyncExternalStore } from "react";
import { FONT_FAMILIES } from "../lib/elements/types";
import { fontString } from "../lib/text";

export const FONT_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,700;1,400;1,700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700&display=swap";

const FONT_LINK_ATTRIBUTE = "data-whiteboard-fonts";

const CANVAS_FONT_VARIANTS = FONT_FAMILIES.flatMap((fontFamily) =>
  [false, true].flatMap((bold) =>
    [false, true].map((italic) => fontString({ fontFamily, fontSize: 16, bold, italic })),
  ),
);

let fontsVersion = 0;
const listeners = new Set<() => void>();

function bumpFontsVersion() {
  fontsVersion += 1;
  listeners.forEach((listener) => listener());
}

function loadCanvasFonts() {
  Promise.all(CANVAS_FONT_VARIANTS.map((font) => document.fonts.load(font))).then(bumpFontsVersion, bumpFontsVersion);
}

function subscribeFonts(listener: () => void) {
  if (listeners.size === 0) {
    document.fonts.addEventListener("loadingdone", bumpFontsVersion);
    loadCanvasFonts();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) document.fonts.removeEventListener("loadingdone", bumpFontsVersion);
  };
}

export function useFontsVersion(): number {
  return useSyncExternalStore(
    subscribeFonts,
    () => fontsVersion,
    () => 0,
  );
}

function hasFontStylesheet(): boolean {
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).some(
    (link) => link.hasAttribute(FONT_LINK_ATTRIBUTE) || link.href === FONT_STYLESHEET_URL,
  );
}

function addFontStylesheet() {
  if (hasFontStylesheet()) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_STYLESHEET_URL;
  link.setAttribute(FONT_LINK_ATTRIBUTE, "");
  link.addEventListener("load", loadCanvasFonts, { once: true });
  document.head.appendChild(link);
}

export function useFontStylesheet(enabled: boolean) {
  useEffect(() => {
    if (enabled) addFontStylesheet();
  }, [enabled]);
}
