import { getRotatedEnvelope } from "../envelope";
import type { Bounds, Point, TextElement } from "../types";

export const FONT_FAMILY = "'Caveat', cursive";
export const LINE_HEIGHT_RATIO = 1.25;
const MIN_WIDTH = 4;

let measurer: HTMLDivElement | null = null;

function getMeasurer() {
  if (measurer) return measurer;

  measurer = document.createElement("div");
  Object.assign(measurer.style, {
    position: "fixed",
    left: "-9999px",
    top: "-9999px",
    visibility: "hidden",
    pointerEvents: "none",
    width: "max-content",
    whiteSpace: "pre",
    fontFamily: FONT_FAMILY,
    lineHeight: String(LINE_HEIGHT_RATIO),
  });
  document.body.append(measurer);
  return measurer;
}

/** Mede pelo DOM, a mesma plataforma responsável por exibir a fonte web. */
export function measureText(
  text: string,
  fontSize: number,
): { width: number; height: number } {
  const element = getMeasurer();
  const lines = (text || " ").split("\n");
  const fragment = document.createDocumentFragment();

  lines.forEach((line, index) => {
    // O espaço de largura zero mantém uma line box para linhas vazias,
    // inclusive a linha criada por uma quebra final ("texto\\n").
    fragment.append(document.createTextNode(line || "\u200B"));
    if (index < lines.length - 1) fragment.append(document.createElement("br"));
  });

  element.replaceChildren(fragment);
  element.style.fontSize = `${fontSize}px`;
  const { width, height } = element.getBoundingClientRect();
  return { width: Math.max(width, MIN_WIDTH), height };
}

export function textContainsPoint(el: TextElement, point: Point): boolean {
  return (
    point.x >= el.x &&
    point.x <= el.x + el.width &&
    point.y >= el.y &&
    point.y <= el.y + el.height
  );
}

export function getTextGeometry(el: TextElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

export function getTextBounds(el: TextElement): Bounds {
  const geometry = getTextGeometry(el);
  const corners: Point[] = [
    { x: el.x, y: el.y },
    { x: el.x + el.width, y: el.y },
    { x: el.x + el.width, y: el.y + el.height },
    { x: el.x, y: el.y + el.height },
  ];
  return getRotatedEnvelope(corners, geometry, el.angle);
}
