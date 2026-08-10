import rough from "roughjs";
import type { Bounds, CanvasElement, Point } from "../geometry/types";
import { applyCameraTransform, type Camera } from "./camera";
import { drawGrid } from "./grid";
import {
  drawElement,
  getElementGeometry,
  getGroupBounds,
} from "../geometry/elementOperations";
import { useCanvasStore } from "../../store/useCanvasStore";
import { getHandlePositions, RESIZE_HANDLE_TYPES } from "./handles";

/**
 * Redesenha o canvas inteiro a cada frame relevante, sem dirty-checking.
 * Ordem: grid -> elementos (ainda não implementado) -> seleção (idem).
 * O parâmetro `elements` já existe na assinatura para não precisar
 * mudar a chamada em Canvas.tsx quando o desenho de formas for adicionado.
 */
export function render(
  canvas: HTMLCanvasElement,
  elements: CanvasElement[],
  camera: Camera,
) {
  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;

  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);

  ctx.save();
  applyCameraTransform(ctx, camera);

  drawGrid(ctx, width, height, camera);

  const rc = rough.canvas(canvas);
  
  const { selectionBox, selectedElementIds, editingElementId } =
    useCanvasStore.getState();

  elements.forEach((el) => {
    if (el.id === editingElementId) return;
    drawElement(el, rc, ctx);
  });

  if (selectionBox) {
    drawSelectionRect(ctx, camera.zoom, selectionBox);
  }

  const selectedElements = elements.filter((el) =>
    selectedElementIds.includes(el.id),
  );

  if (selectedElements.length === 1) {
    const el = selectedElements[0];
    drawSelectionBox(ctx, camera.zoom, getElementGeometry(el), el.angle);
  } else if (selectedElements.length > 1) {
    const groupBounds = getGroupBounds(selectedElements);
    if (groupBounds) {
      drawSelectionBox(ctx, camera.zoom, groupBounds, 0);
    }
  }

  ctx.restore();
}

function drawSelectionRect(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  box: { start: Point; current: Point },
) {
  const minX = Math.min(box.start.x, box.current.x);
  const maxX = Math.max(box.start.x, box.current.x);
  const minY = Math.min(box.start.y, box.current.y);
  const maxY = Math.max(box.start.y, box.current.y);

  ctx.save();
  ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
  ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
  ctx.lineWidth = 1 / zoom;
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
  ctx.restore();
}

function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  bounds: Bounds,
  angle: number,
) {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;

  ctx.save();

  if (angle !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  const padding = 8 / zoom;
  ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([5 / zoom, 5 / zoom]);
  ctx.strokeRect(
    bounds.x - padding,
    bounds.y - padding,
    bounds.width + 2 * padding,
    bounds.height + 2 * padding,
  );
  ctx.setLineDash([]);

  const handleSize = 12 / zoom;
  const halfHandle = handleSize / 2;
  const positions = getHandlePositions(bounds, zoom);

  RESIZE_HANDLE_TYPES.forEach((type) => {
    const p = positions[type];
    ctx.fillStyle = "rgb(241, 246, 255)";
    ctx.strokeStyle = "rgba(59, 130, 246, 1)";
    ctx.lineWidth = 1 / zoom;
    ctx.fillRect(p.x - halfHandle, p.y - halfHandle, handleSize, handleSize);
    ctx.strokeRect(p.x - halfHandle, p.y - halfHandle, handleSize, handleSize);
  });

  const rotationHandle = positions.rotation;
  const topCenter = positions.n;

  ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
  ctx.lineWidth = 1.5 / zoom;
  ctx.beginPath();
  ctx.moveTo(topCenter.x, topCenter.y);
  ctx.lineTo(rotationHandle.x, rotationHandle.y);
  ctx.stroke();

  const rotationRadius = 5 / zoom;
  ctx.beginPath();
  ctx.arc(rotationHandle.x, rotationHandle.y, rotationRadius, 0, Math.PI * 2);
  ctx.fillStyle = "rgb(241, 246, 255)";
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
