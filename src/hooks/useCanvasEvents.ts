import { useRef } from "react";
import { screenToWorld } from "../lib/canvas/camera";
import { useCanvasStore } from "../store/useCanvasStore";
import { useDrawMode } from "./useDrawMode";
import { useMoveMode } from "./useMoveMode";
import { useResizeMode } from "./useResizeMode";
import { useRotationMode } from "./useRotationMode";
import { useSelectioMode } from "./useSelectionMode";
import { type CanvasElement } from "../lib/geometry/types";
import { useTextMode } from "./useTextMode";
import { elementContainsPoint } from "../lib/geometry/elementOperations";

export function useCanvasEvents() {
  const { camera, activeTool } = useCanvasStore();
  const beforeElements = useRef<CanvasElement[]>([]);
  const drawMode = useDrawMode();
  const selectionMode = useSelectioMode();
  const moveMode = useMoveMode();
  const resizeMode = useResizeMode();
  const rotationMode = useRotationMode();
  const textMode = useTextMode();

  function worldPointFromPointerEvent(event: React.PointerEvent) {
    return screenToWorld(camera, {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    });
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (useCanvasStore.getState().editingElementId) return;

    beforeElements.current = useCanvasStore.getState().elements;
    const worldPoint = worldPointFromPointerEvent(event);

    if (activeTool === "text") {
      event.preventDefault();
      textMode.startCreating(worldPoint);
      return;
    }

    if (activeTool === "selection") {
      if (!event.shiftKey) {
        const startedRotating = rotationMode.tryStartRotating(worldPoint);
        if (startedRotating) return;

        const startedResizing = resizeMode.tryStartResizing(worldPoint);
        if (startedResizing) return;

        const startedMoving = moveMode.tryStartMoving(worldPoint);
        if (startedMoving) return;
      }

      selectionMode.startSelection(worldPoint, event.shiftKey);
      return;
    }

    drawMode.startDrawing(worldPoint);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (useCanvasStore.getState().editingElementId) return;

    const worldPoint = worldPointFromPointerEvent(event);

    const anyGestureActive =
      resizeMode.isResizing() ||
      rotationMode.isRotating() ||
      moveMode.isMoving();

    if (!anyGestureActive) {
      if (!resizeMode.updateHoverCursor(worldPoint)) {
        rotationMode.updateHoverCursor(worldPoint);
      }
    }

    if (rotationMode.isRotating()) {
      rotationMode.applyRotation(worldPoint);
      return;
    }

    if (resizeMode.isResizing()) {
      resizeMode.applyResize(worldPoint);
      return;
    }

    if (moveMode.isMoving()) {
      moveMode.applyMove(worldPoint);
      return;
    }

    if (activeTool === "selection") {
      selectionMode.updateSelection(worldPoint);
      return;
    }

    drawMode.updateDrawing(worldPoint);
  }

  function handlePointerUp() {
    if (useCanvasStore.getState().editingElementId) return;

    drawMode.stopDrawing();
    selectionMode.stopSelection();
    moveMode.stopMoving();
    resizeMode.stopResizing();
    rotationMode.stopRotating();

    useCanvasStore.getState().commitHistory(beforeElements.current);
  }

  function handleDoubleClick(event: React.PointerEvent | React.MouseEvent) {
    if (activeTool !== "selection") return;

    const worldPoint = worldPointFromPointerEvent(event as React.PointerEvent);
    const { elements } = useCanvasStore.getState();

    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "text" && elementContainsPoint(el, worldPoint)) {
        textMode.startEditingExisting(el.id);
        return;
      }
    }
  }

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
  };
}
