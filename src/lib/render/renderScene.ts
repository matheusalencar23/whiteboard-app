import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Bounds } from "../geometry/bounds";
import type { BoardElement } from "../elements/types";
import { getElementBounds, renderElement } from "../elements/registry";
import { getHandleRects, getSelectionBounds, getSelectionFrame } from "../selection";
import type { Viewport } from "../viewport";

const SELECTION_COLOR = "#4f7cff";

/** Tudo que é desenhado por cima dos elementos e não faz parte deles. */
export interface SceneOverlay {
  selected: BoardElement[];
  /** Esconde as alças (por exemplo, enquanto a seleção está sendo movida). */
  showHandles: boolean;
  /** Retângulo da seleção por caixa, em coordenadas de mundo. */
  selectionBox: Bounds | null;
}

function strokeFrame(ctx: CanvasRenderingContext2D, b: Bounds) {
  ctx.strokeRect(b.x, b.y, b.width, b.height);
}

function renderOverlay(ctx: CanvasRenderingContext2D, overlay: SceneOverlay, zoom: number) {
  ctx.save();
  // Espessuras em pixels de tela, não importa o zoom.
  ctx.lineWidth = 1 / zoom;
  ctx.strokeStyle = SELECTION_COLOR;

  const bounds = getSelectionBounds(overlay.selected);
  if (bounds) {
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
