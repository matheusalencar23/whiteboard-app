import type { RoughCanvas } from "roughjs/bin/canvas";
import { expandBounds, getCenter, type Bounds } from "../geometry/bounds";
import type { ArrowElement, BoardElement } from "../elements/types";
import { getConnectionAnchors, renderElement } from "../elements/registry";
import { anchorPoint, isSegmentFixed } from "../elements/bindings";
import type { Point } from "../types";
import { getDiamondVertices } from "../elements/shapes/diamond";
import {
  ENDPOINT_RADIUS,
  ROTATION_HANDLE_RADIUS,
  getArrowHandles,
  getElementFrame,
  getHandleRects,
  getRotationHandleLocal,
  getSelectionFrame,
  getSingleArrow,
  padFrame,
  type SelectionFrame,
} from "../selection";
import type { Viewport } from "../viewport";
import { drawGrid } from "./grid";

const SELECTION_COLOR = "#4f7cff";

export interface SceneOverlay {
  selected: BoardElement[];
  showHandles: boolean;
  selectionBox: Bounds | null;
  bindingTarget: BoardElement | null;
  bindingAnchor: Point | null;
  frameOverride: SelectionFrame | null;
}

const CONNECTION_POINT_RADIUS = 4;

const BINDING_HIGHLIGHT_PADDING = 4;

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

function renderArrowHandles(ctx: CanvasRenderingContext2D, arrow: ArrowElement, zoom: number) {
  for (const handle of getArrowHandles(arrow, zoom)) {
    const p = handle.position;
    ctx.beginPath();
    if (handle.kind === "midpoint" || handle.kind === "segment") {
      ctx.arc(p.x, p.y, (ENDPOINT_RADIUS * 0.7) / zoom, 0, Math.PI * 2);
      ctx.save();
      ctx.globalAlpha =
        handle.kind === "segment" && isSegmentFixed(arrow, handle.index) ? 0.9 : 0.45;
      ctx.fillStyle = SELECTION_COLOR;
      ctx.fill();
      ctx.restore();
      continue;
    }
    ctx.arc(p.x, p.y, ENDPOINT_RADIUS / zoom, 0, Math.PI * 2);
    const bound =
      handle.kind === "end" &&
      (handle.end === "start" ? arrow.startBinding : arrow.endBinding) !== null;
    ctx.fillStyle = bound ? SELECTION_COLOR : "#ffffff";
    ctx.fill();
    ctx.stroke();
  }
}

function strokeFrame(ctx: CanvasRenderingContext2D, b: Bounds) {
  ctx.strokeRect(b.x, b.y, b.width, b.height);
}

function withFrame(ctx: CanvasRenderingContext2D, frame: SelectionFrame, draw: () => void) {
  const center = getCenter(frame.box);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(frame.rotation);
  ctx.translate(-center.x, -center.y);
  draw();
  ctx.restore();
}

function renderFrameHandles(ctx: CanvasRenderingContext2D, box: Bounds, zoom: number) {
  ctx.fillStyle = "#ffffff";
  for (const rect of Object.values(getHandleRects(box, zoom))) {
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    strokeFrame(ctx, rect);
  }

  const { stem, knob } = getRotationHandleLocal(box, zoom);
  ctx.beginPath();
  ctx.moveTo(stem.x, stem.y);
  ctx.lineTo(knob.x, knob.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(knob.x, knob.y, ROTATION_HANDLE_RADIUS / zoom, 0, Math.PI * 2);
  ctx.fillStyle = SELECTION_COLOR;
  ctx.fill();
}

function renderOverlay(ctx: CanvasRenderingContext2D, overlay: SceneOverlay, zoom: number) {
  ctx.save();
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

  const frame = overlay.frameOverride ?? getSelectionFrame(overlay.selected);
  const singleArrow = getSingleArrow(overlay.selected);
  if (singleArrow) {
    renderArrowHandles(ctx, singleArrow, zoom);
  } else if (frame) {
    if (overlay.selected.length > 1) {
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      for (const el of overlay.selected) {
        const own = getElementFrame(el);
        withFrame(ctx, own, () => strokeFrame(ctx, padFrame(own.box, zoom)));
      }
      ctx.setLineDash([]);
    }

    withFrame(ctx, frame, () => {
      strokeFrame(ctx, padFrame(frame.box, zoom));
      if (overlay.showHandles) renderFrameHandles(ctx, frame.box, zoom);
    });
  }

  if (overlay.selectionBox) {
    const b = overlay.selectionBox;
    ctx.fillStyle = "rgba(79, 124, 255, 0.08)";
    ctx.fillRect(b.x, b.y, b.width, b.height);
    strokeFrame(ctx, b);
  }

  ctx.restore();
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  elements: BoardElement[],
  overlay: SceneOverlay,
  viewport: Viewport,
  dpr: number,
  gridSize: number | null,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const scale = dpr * viewport.zoom;
  ctx.setTransform(scale, 0, 0, scale, viewport.offsetX * dpr, viewport.offsetY * dpr);

  if (gridSize) {
    drawGrid(ctx, viewport, gridSize, ctx.canvas.width / dpr, ctx.canvas.height / dpr);
  }

  for (const element of elements) {
    renderElement(element, rc, ctx);
  }
  renderOverlay(ctx, overlay, viewport.zoom);
}
