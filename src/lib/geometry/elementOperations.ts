import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Bounds, CanvasElement, HandleType, Point } from "./types";
import {
  drawRectangle,
  getRectangleBounds,
  getRectangleGeometry,
  rectangleContainsPoint,
} from "./shapes/rectangle";
import {
  drawEllipse,
  ellipseContainsPoint,
  getEllipseBounds,
  getEllipseGeometry,
} from "./shapes/ellipse";
import {
  drawLine,
  getLineBounds,
  getLineGeometry,
  lineContainsPoint,
} from "./shapes/line";
import { cloneElement } from "./createElement";
import {
  arrowContainsPoint,
  drawArrow,
  getArrowBounds,
  getArrowGeometry,
} from "./shapes/arrow";
import { toShapeSpace } from "./coordinates";
import {
  getTextBounds,
  getTextGeometry,
  measureText,
  textContainsPoint,
} from "./shapes/text";
import { getAnchorPoint, getHandlePoint } from "./resize";
import { rotatePoint } from "./transform";

export const MIN_DRAW_SIZE = 2;

export function drawElement(
  el: CanvasElement,
  rc: RoughCanvas,
  ctx: CanvasRenderingContext2D,
) {
  switch (el.type) {
    case "rectangle":
      return drawRectangle(el, rc, ctx);
    case "ellipse":
      return drawEllipse(el, rc, ctx);
    case "line":
      return drawLine(el, rc, ctx);
    case "arrow":
      return drawArrow(el, rc, ctx);
    case "text":
      return;
  }
}
export function elementContainsPoint(el: CanvasElement, point: Point): boolean {
  const geometry = getElementGeometry(el);
  const testPoint = toShapeSpace(point, geometry, el.angle);

  switch (el.type) {
    case "rectangle":
      return rectangleContainsPoint(el, testPoint);
    case "ellipse":
      return ellipseContainsPoint(el, testPoint);
    case "line":
      return lineContainsPoint(el, testPoint);
    case "arrow":
      return arrowContainsPoint(el, testPoint);
    case "text":
      return textContainsPoint(el, testPoint);
  }
}

export function getElementGeometry(el: CanvasElement): Bounds {
  switch (el.type) {
    case "rectangle":
      return getRectangleGeometry(el);
    case "ellipse":
      return getEllipseGeometry(el);
    case "line":
      return getLineGeometry(el);
    case "arrow":
      return getArrowGeometry(el);
    case "text":
      return getTextGeometry(el);
  }
}

export function getElementBounds(el: CanvasElement): Bounds {
  switch (el.type) {
    case "rectangle":
      return getRectangleBounds(el);
    case "ellipse":
      return getEllipseBounds(el);
    case "line":
      return getLineBounds(el);
    case "arrow":
      return getArrowBounds(el);
    case "text":
      return getTextBounds(el);
  }
}

/**
 * Verdadeiro se a forma é pequena demais para ter sido um desenho
 * intencional (clique sem arraste, ou arraste de 1-2px).
 *
 * Usa a geometria (largura/altura do bounding box), não uma medida
 * específica por tipo — o que também resolve, de graça, o caso de uma
 * linha com um único ponto: sua geometria já é {width: 0, height: 0},
 * então cai no mesmo critério, sem precisar de tratamento especial.
 *
 * Trade-off aceito: uma linha diagonal muito curta (ex.: dx=1.9, dy=1.9)
 * pode ser considerada vazia mesmo tendo ~2.7px de comprimento real,
 * porque width e height são avaliados isoladamente. Na prática, essa
 * diferença é imperceptível para o usuário — não vale a complexidade de
 * um critério por tipo só para esse caso extremo.
 */
export function isElementEmpty(el: CanvasElement): boolean {
  const geometry = getElementGeometry(el);
  return (
    Math.abs(geometry.width) < MIN_DRAW_SIZE &&
    Math.abs(geometry.height) < MIN_DRAW_SIZE
  );
}

/**
 * Move um elemento por um delta, independente do tipo de forma.
 *
 * Funciona genericamente para qualquer forma porque toda geometria é
 * ancorada em x/y — inclusive LineElement, cujos `points` são relativos
 * a x/y, então não precisam ser recalculados: eles "andam junto"
 * automaticamente ao transladar apenas x/y.
 */
export function moveElement(
  el: CanvasElement,
  deltaX: number,
  deltaY: number,
): CanvasElement {
  return cloneElement(el, { x: el.x + deltaX, y: el.y + deltaY });
}

/**
 * Aplica uma mudança de bounds a um elemento, de forma específica ao
 * tipo: formas-caixa recebem width/height diretamente; formas lineares
 * têm seus pontos escalados proporcionalmente, mantendo a forma.
 */
export function applyBoundsToElement(
  el: CanvasElement,
  oldBounds: Bounds,
  newBounds: Bounds,
  handle: HandleType,
): CanvasElement {
  if (el.type === "line" || el.type === "arrow") {
    const scaleX = newBounds.width / (oldBounds.width || 1);
    const scaleY = newBounds.height / (oldBounds.height || 1);

    const worldPoints = el.points.map((p) => ({
      x: el.x + p.x,
      y: el.y + p.y,
    }));
    const mapped = worldPoints.map((p) => ({
      x: newBounds.x + (p.x - oldBounds.x) * scaleX,
      y: newBounds.y + (p.y - oldBounds.y) * scaleY,
    }));

    const originX = mapped[0].x;
    const originY = mapped[0].y;

    return cloneElement(el, {
      x: originX,
      y: originY,
      points: mapped.map((p) => ({ x: p.x - originX, y: p.y - originY })),
    });
  }

  if (el.type === "text") {
    const anchor = getAnchorPoint(oldBounds, handle);
    const originalHandlePoint = getHandlePoint(oldBounds, handle);
    const newHandlePoint = getHandlePoint(newBounds, handle);

    const originalDistance =
      Math.hypot(
        originalHandlePoint.x - anchor.x,
        originalHandlePoint.y - anchor.y,
      ) || 1;
    const newDistance = Math.hypot(
      newHandlePoint.x - anchor.x,
      newHandlePoint.y - anchor.y,
    );

    const scale = newDistance / originalDistance;
    const newFontSize = Math.max(4, el.fontSize * scale);
    const { width, height } = measureText(el.text, newFontSize);

    // `newBounds` descreve a caixa local calculada pelo resize. Para texto
    // rotacionado, reconstruir x/y diretamente nela deslocava o ponto oposto
    // ao handle. Mantemos esse ponto fixo também no espaço rotacionado.
    const resizedCenter = {
      x: newBounds.x + newBounds.width / 2,
      y: newBounds.y + newBounds.height / 2,
    };
    const resizedAnchor = getAnchorPoint(newBounds, handle);
    const fixedAnchor = rotatePoint(resizedAnchor, resizedCenter, el.angle);
    const localAnchor = getAnchorPoint({ x: 0, y: 0, width, height }, handle);
    const localCenter = { x: width / 2, y: height / 2 };
    const rotatedAnchorOffset = rotatePoint(
      localAnchor,
      localCenter,
      el.angle,
    );
    const newCenter = {
      x: fixedAnchor.x - (rotatedAnchorOffset.x - localCenter.x),
      y: fixedAnchor.y - (rotatedAnchorOffset.y - localCenter.y),
    };
    const x = newCenter.x - width / 2;
    const y = newCenter.y - height / 2;

    return cloneElement(el, { x, y, width, height, fontSize: newFontSize });
  }

  return cloneElement(el, {
    x: newBounds.x,
    y: newBounds.y,
    width: newBounds.width,
    height: newBounds.height,
  });
}

/** Caixa que envolve um grupo de elementos, já rotacionados individualmente. */
export function getGroupBounds(elements: CanvasElement[]) {
  if (elements.length === 0) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  elements.forEach((el) => {
    const bounds = getElementBounds(el);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
