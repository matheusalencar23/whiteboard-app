import { useEffect, useRef, useState } from "react";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useCanvasStore } from "../../store/useCanvasStore";
import { useCanvasEvents } from "../../hooks/useCanvasEvents";
import { render } from "../../lib/canvas/engine";
import { panBy, zoomAtScreenPoint } from "../../lib/canvas/camera";
import { TextEditorOverlay } from "../TextEditor/TextEditorOverlay";
import "./style.css";

const PAN_SPEED = 1.5;

export function Canvas() {
  useKeyboardShortcuts();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    elements,
    camera,
    setCamera,
    selectedElementIds,
    selectionBox,
    cursor,
  } = useCanvasStore();

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
  } = useCanvasEvents();

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    function handleResize() {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    render(canvas, elements, camera);
  }, [elements, camera, dimensions, selectedElementIds, selectionBox]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();

      if (event.ctrlKey) {
        const rect = canvas!.getBoundingClientRect();
        const screenPoint = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        setCamera((prev) =>
          zoomAtScreenPoint(prev, screenPoint, event.deltaY < 0),
        );
        return;
      }

      const delta = event.shiftKey
        ? { x: -event.deltaY * PAN_SPEED, y: 0 }
        : { x: 0, y: -event.deltaY * PAN_SPEED };

      setCamera((prev) => panBy(prev, delta));
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [setCamera]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.cursor = cursor;
  }, [cursor]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="canvas"
        width={dimensions.width}
        height={dimensions.height}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onDoubleClick={handleDoubleClick}
      />
      <TextEditorOverlay />
    </>
  );
}
