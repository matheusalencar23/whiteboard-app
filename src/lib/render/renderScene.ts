import type { RoughCanvas } from "roughjs/bin/canvas";
import { expandBounds, getCenter, type Bounds } from "../geometry/bounds";
import type { ArrowElement, BoardElement } from "../elements/types";
import { getConnectionAnchors, getElementBounds, renderElement } from "../elements/registry";
import { anchorPoint } from "../elements/bindings";
import type { Point } from "../types";
import { getDiamondVertices } from "../elements/shapes/diamond";
import {
  ENDPOINT_RADIUS,
  getEndpointHandles,
  getHandleRects,
  getSelectionBounds,
  getSelectionFrame,
  getSingleArrow,
} from "../selection";
import type { Viewport } from "../viewport";

const SELECTION_COLOR = "#4f7cff";

/** Tudo que é desenhado por cima dos elementos e não faz parte deles. */
export interface SceneOverlay {
  selected: BoardElement[];
  /** Esconde as alças (por exemplo, enquanto a seleção está sendo movida). */
  showHandles: boolean;
  /** Retângulo da seleção por caixa, em coordenadas de mundo. */
  selectionBox: Bounds | null;
  /** Forma em que a ponta da seta sendo desenhada ou arrastada vai se ligar. */
  bindingTarget: BoardElement | null;
  /** Ponto de conexão do alvo em que a ponta vai encaixar (relativo, 0 a 1). */
  bindingAnchor: Point | null;
}

/** Raio dos pontos de conexão, em pixels de tela. */
const CONNECTION_POINT_RADIUS = 4;

/** Folga do destaque da forma alvo da ligação, em pixels de tela. */
const BINDING_HIGHLIGHT_PADDING = 4;

/** Contorno da forma, afastado `pad` da borda, como caminho do canvas. */
function traceOutline(ctx: CanvasRenderingContext2D, el: BoardElement, pad: number) {
  const center = getCenter(el);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(el.rotation);
  ctx.translate(-center.x, -center.y);

  ctx.beginPath();
  const box = expandBounds(el, pad);
  if (el.type === "ellipse") {
    ctx.ellipse(center.x, center.y, box.width / 2, box.height / 2, 0, 0, Math.PI * 2);
  } else if (el.type === "diamond") {
    // Afasta cada lado `pad` para fora: as semidiagonais a e b crescem
    // pad·√(a²+b²)/b e pad·√(a²+b²)/a, respectivamente.
    const a = el.width / 2;
    const b = el.height / 2;
    const k = Math.hypot(a, b);
    const ga = b > 0 ? (pad * k) / b : pad;
    const gb = a > 0 ? (pad * k) / a : pad;
    const vertices = getDiamondVertices({
      ...el,
      x: el.x - ga,
      y: el.y - gb,
      width: el.width + ga * 2,
      height: el.height + gb * 2,
    });
    vertices.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)));
    ctx.closePath();
  } else {
    ctx.rect(box.x, box.y, box.width, box.height);
  }
  ctx.restore();
}

function renderConnectionPoints(
  ctx: CanvasRenderingContext2D,
  shape: BoardElement,
  active: Point | null,
  zoom: number,
) {
  for (const anchor of getConnectionAnchors(shape)) {
    const p = anchorPoint(shape, anchor);
    const isActive = active !== null && active.x === anchor.x && active.y === anchor.y;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (isActive ? CONNECTION_POINT_RADIUS * 1.5 : CONNECTION_POINT_RADIUS) / zoom, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? SELECTION_COLOR : "#ffffff";
    ctx.fill();
    ctx.stroke();
  }
}

function renderEndpointHandles(ctx: CanvasRenderingContext2D, arrow: ArrowElement, zoom: number) {
  const handles = getEndpointHandles(arrow);
  const bound = { start: arrow.startBinding !== null, end: arrow.endBinding !== null };
  for (const end of ["start", "end"] as const) {
    const p = handles[end];
    ctx.beginPath();
    ctx.arc(p.x, p.y, ENDPOINT_RADIUS / zoom, 0, Math.PI * 2);
    // Ponta ligada a uma forma: alça preenchida.
    ctx.fillStyle = bound[end] ? SELECTION_COLOR : "#ffffff";
    ctx.fill();
    ctx.stroke();
  }
}

function strokeFrame(ctx: CanvasRenderingContext2D, b: Bounds) {
  ctx.strokeRect(b.x, b.y, b.width, b.height);
}

function renderOverlay(ctx: CanvasRenderingContext2D, overlay: SceneOverlay, zoom: number) {
  ctx.save();
  // Espessuras em pixels de tela, não importa o zoom.
  ctx.lineWidth = 1 / zoom;
  ctx.strokeStyle = SELECTION_COLOR;

  if (overlay.bindingTarget) {
    ctx.save();
    ctx.lineWidth = 4 / zoom;
    ctx.globalAlpha = 0.35;
    traceOutline(ctx, overlay.bindingTarget, BINDING_HIGHLIGHT_PADDING / zoom);
    ctx.stroke();
    ctx.restore();
    renderConnectionPoints(ctx, overlay.bindingTarget, overlay.bindingAnchor, zoom);
  }

  const bounds = getSelectionBounds(overlay.selected);
  const singleArrow = getSingleArrow(overlay.selected);
  if (singleArrow) {
    renderEndpointHandles(ctx, singleArrow, zoom);
  } else if (bounds) {
    // Na seleção múltipla, cada elemento ganha um contorno tracejado.
    if (overlay.selected.length > 1) {
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      for (const el of overlay.selected) {
        strokeFrame(ctx, getSelectionFrame(getElementBounds(el), zoom));
      }
      ctx.setLineDash([]);
    }

    strokeFrame(ctx, getSelectionFrame(bounds, zoom));

    if (overlay.showHandles) {
      ctx.fillStyle = "#ffffff";
      for (const rect of Object.values(getHandleRects(bounds, zoom))) {
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        strokeFrame(ctx, rect);
      }
    }
  }

  if (overlay.selectionBox) {
    const b = overlay.selectionBox;
    ctx.fillStyle = "rgba(79, 124, 255, 0.08)";
    ctx.fillRect(b.x, b.y, b.width, b.height);
    strokeFrame(ctx, b);
  }

  ctx.restore();
}

/**
 * Limpa o canvas e desenha os elementos e a camada de seleção em coordenadas
 * de mundo. `dpr` é o devicePixelRatio usado para dimensionar o canvas.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  elements: BoardElement[],
  overlay: SceneOverlay,
  viewport: Viewport,
  dpr: number,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const scale = dpr * viewport.zoom;
  ctx.setTransform(scale, 0, 0, scale, viewport.offsetX * dpr, viewport.offsetY * dpr);

  for (const element of elements) {
    renderElement(element, rc, ctx);
  }
  renderOverlay(ctx, overlay, viewport.zoom);
}
