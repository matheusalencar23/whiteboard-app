import { useEffect } from "react";
import { worldToScreen } from "../../lib/canvas/camera";
import {
  FONT_FAMILY,
  LINE_HEIGHT_RATIO,
  measureText,
} from "../../lib/geometry/shapes/text";
import type { TextElement } from "../../lib/geometry/types";
import { useCanvasStore } from "../../store/useCanvasStore";
import { cloneElement } from "../../lib/geometry/createElement";
import "./style.css";

function TextDisplay({ element }: { element: TextElement }) {
  const { camera } = useCanvasStore();
  const screenPos = worldToScreen(camera, { x: element.x, y: element.y });

  return (
    <div
      className="text-display text-element"
      style={{
        left: screenPos.x,
        top: screenPos.y,
        width: Math.max(element.width * camera.zoom, 20),
        height: element.height * camera.zoom,
        transform:
          element.angle !== 0 ? `rotate(${element.angle}deg)` : undefined,
        fontSize: element.fontSize * camera.zoom,
        fontFamily: FONT_FAMILY,
        color: element.stroke,
        lineHeight: LINE_HEIGHT_RATIO,
      }}
    >
      {renderText(element.text)}
    </div>
  );
}

function renderText(text: string) {
  return text.endsWith("\n") ? `${text}\u200B` : text || "\u200B";
}

export function TextLayer() {
  const { elements, editingElementId } = useCanvasStore();

  useEffect(() => {
    let disposed = false;

    document.fonts.ready.then(() => {
      if (disposed) return;

      const { elements: currentElements, updateElement } =
        useCanvasStore.getState();
      currentElements.forEach((element) => {
        if (element.type !== "text") return;

        const measured = measureText(element.text, element.fontSize);
        if (
          Math.abs(measured.width - element.width) < 0.01 &&
          Math.abs(measured.height - element.height) < 0.01
        ) {
          return;
        }

        updateElement(element.id, cloneElement(element, measured));
      });
    });

    return () => {
      disposed = true;
    };
  }, []);

  return (
    <div className="text-layer">
      {elements
        .filter(
          (element): element is TextElement =>
            element.type === "text" && element.id !== editingElementId,
        )
        .map((element) => (
          <TextDisplay key={element.id} element={element} />
        ))}
    </div>
  );
}
