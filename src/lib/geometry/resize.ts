import { degreesToRadians } from "./transform";
import type { Bounds, CanvasElement, HandleType, Point } from "./types";

export function calculateRotatedResize(
  geometry: Bounds,
  angle: number,
  handle: HandleType,
  mouse: Point,
) {
  const rad = degreesToRadians(angle);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const uX = { x: cos, y: sin };
  const uY = { x: -sin, y: cos };

  const cX = geometry.x + geometry.width / 2;
  const cY = geometry.y + geometry.height / 2;

  const dx = mouse.x - cX;
  const dy = mouse.y - cY;

  const projX = dx * uX.x + dy * uX.y;
  const projY = dx * uY.x + dy * uY.y;

  const halfWidth = geometry.width / 2;
  const halfHeight = geometry.height / 2;

  let rawWidth = geometry.width;
  let rawHeight = geometry.height;

  let anchorSignX = 0;
  let anchorSignY = 0;

  if (handle.includes("e")) {
    rawWidth = projX + halfWidth;
    anchorSignX = -1;
  } else if (handle.includes("w")) {
    rawWidth = halfWidth - projX;
    anchorSignX = 1;
  }

  if (handle.includes("s")) {
    rawHeight = projY + halfHeight;
    anchorSignY = -1;
  } else if (handle.includes("n")) {
    rawHeight = halfHeight - projY;
    anchorSignY = 1;
  }

  const anchorGlobalX =
    cX + anchorSignX * halfWidth * uX.x + anchorSignY * halfHeight * uY.x;
  const anchorGlobalY =
    cY + anchorSignX * halfWidth * uX.y + anchorSignY * halfHeight * uY.y;

  const finalWidth = Math.abs(rawWidth);
  const finalHeight = Math.abs(rawHeight);

  const dirX = rawWidth < 0 ? -anchorSignX : anchorSignX;
  const dirY = rawHeight < 0 ? -anchorSignY : anchorSignY;

  const newCx =
    anchorGlobalX -
    dirX * (finalWidth / 2) * uX.x -
    dirY * (finalHeight / 2) * uY.x;
  const newCy =
    anchorGlobalY -
    dirX * (finalWidth / 2) * uX.y -
    dirY * (finalHeight / 2) * uY.y;

  return {
    x: newCx - finalWidth / 2,
    y: newCy - finalHeight / 2,
    width: finalWidth,
    height: finalHeight,
  };
}

/**
 * Redimensiona um GRUPO de elementos. Escala aplicada eixo-alinhada à
 * posição relativa de cada elemento dentro do bounds do grupo.
 *
 * Quando algum elemento tem rotação própria, força escala uniforme nos
 * dois eixos — mesmo em handles de aresta — porque escalar de forma
 * não-uniforme um elemento rotacionado produz um paralelogramo (shear),
 * que o modelo de dados não representa. Mesmo comportamento do Excalidraw.
 */
export function calculateGroupResize(
  elements: CanvasElement[],
  groupBounds: Bounds,
  handle: HandleType,
  mouse: Point,
  elementGeometry: (el: CanvasElement) => Bounds,
): {
  id: string;
  bounds: Bounds;
}[] {
  const newGroupBounds = calculateAxisAlignedBounds(groupBounds, handle, mouse);

  const rawScaleX = newGroupBounds.width / (groupBounds.width || 1);
  const rawScaleY = newGroupBounds.height / (groupBounds.height || 1);

  const hasRotatedElement = elements.some((el) => (el.angle || 0) % 360 !== 0);
  const { scaleX, scaleY } = hasRotatedElement
    ? resolveUniformScale(handle, rawScaleX, rawScaleY)
    : { scaleX: rawScaleX, scaleY: rawScaleY };

  const anchor = getAnchorPoint(groupBounds, handle);

  return elements.map((el) => {
    const geometry = elementGeometry(el);
    const relX = geometry.x - anchor.x;
    const relY = geometry.y - anchor.y;

    return {
      id: el.id,
      bounds: normalizeBounds({
        x: anchor.x + relX * scaleX,
        y: anchor.y + relY * scaleY,
        width: geometry.width * scaleX,
        height: geometry.height * scaleY,
      }),
    };
  });
}

function calculateAxisAlignedBounds(
  groupBounds: Bounds,
  handle: HandleType,
  mouse: Point,
): Bounds {
  let { x, y, width, height } = groupBounds;
  const right = x + width;
  const bottom = y + height;

  switch (handle) {
    case "se":
      width = mouse.x - x;
      height = mouse.y - y;
      break;
    case "e":
      width = mouse.x - x;
      break;
    case "s":
      height = mouse.y - y;
      break;
    case "nw":
      x = mouse.x;
      y = mouse.y;
      width = right - mouse.x;
      height = bottom - mouse.y;
      break;
    case "n":
      y = mouse.y;
      height = bottom - mouse.y;
      break;
    case "w":
      x = mouse.x;
      width = right - mouse.x;
      break;
    case "ne":
      y = mouse.y;
      width = mouse.x - x;
      height = bottom - mouse.y;
      break;
    case "sw":
      x = mouse.x;
      width = right - mouse.x;
      height = mouse.y - y;
      break;
  }

  return { x, y, width, height };
}

function resolveUniformScale(
  handle: HandleType,
  rawScaleX: number,
  rawScaleY: number,
) {
  const changesX = handle.includes("e") || handle.includes("w");
  const changesY = handle.includes("n") || handle.includes("s");

  let magnitude: number;
  if (changesX && changesY)
    magnitude = (Math.abs(rawScaleX) + Math.abs(rawScaleY)) / 2;
  else if (changesX) magnitude = Math.abs(rawScaleX);
  else magnitude = Math.abs(rawScaleY);

  return {
    scaleX: Math.sign(rawScaleX || 1) * magnitude,
    scaleY: Math.sign(rawScaleY || 1) * magnitude,
  };
}

/** Canto/aresta de `bounds` oposto a `handle` — o ponto que fica fixo durante o resize. */
export function getAnchorPoint(bounds: Bounds, handle: HandleType): Point {
  const { x, y, width, height } = bounds;
  switch (handle) {
    case "se":
      return { x, y };
    case "s":
      return { x: x + width / 2, y };
    case "sw":
      return { x: x + width, y };
    case "e":
      return { x, y: y + height / 2 };
    case "w":
      return { x: x + width, y: y + height / 2 };
    case "ne":
      return { x, y: y + height };
    case "n":
      return { x: x + width / 2, y: y + height };
    case "nw":
      return { x: x + width, y: y + height };
    default:
      return { x: x + width / 2, y: y + height / 2 };
  }
}

/** Garante width/height não-negativos, ajustando x/y para preservar o retângulo real. */
function normalizeBounds(b: Bounds): Bounds {
  const width = Math.abs(b.width);
  const height = Math.abs(b.height);
  const x = b.width < 0 ? b.x + b.width : b.x;
  const y = b.height < 0 ? b.y + b.height : b.y;
  return { x, y, width, height };
}

/** Ponto de `bounds` sob o próprio handle (o canto/aresta sendo arrastado). */
export function getHandlePoint(bounds: Bounds, handle: HandleType): Point {
  const { x, y, width, height } = bounds;
  switch (handle) {
    case "nw":
      return { x, y };
    case "n":
      return { x: x + width / 2, y };
    case "ne":
      return { x: x + width, y };
    case "e":
      return { x: x + width, y: y + height / 2 };
    case "se":
      return { x: x + width, y: y + height };
    case "s":
      return { x: x + width / 2, y: y + height };
    case "sw":
      return { x, y: y + height };
    case "w":
      return { x, y: y + height / 2 };
    default:
      return { x: x + width / 2, y: y + height / 2 };
  }
}

/** Reconstrói x/y de uma caixa a partir do anchor fixo, do handle arrastado e do novo tamanho. */
export function resolveBoxPosition(
  anchor: Point,
  handle: HandleType,
  width: number,
  height: number,
): Point {
  const x = handle.includes("w")
    ? anchor.x - width
    : handle.includes("e")
      ? anchor.x
      : anchor.x - width / 2;
  const y = handle.includes("n")
    ? anchor.y - height
    : handle.includes("s")
      ? anchor.y
      : anchor.y - height / 2;
  return { x, y };
}
