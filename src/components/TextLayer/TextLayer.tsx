import { worldToScreen } from "../../lib/canvas/camera";
import { FONT_FAMILY, LINE_HEIGHT_RATIO } from "../../lib/geometry/shapes/text";
import type { TextElement } from "../../lib/geometry/types";
import { useCanvasStore } from "../../store/useCanvasStore";
import "../TextEditor/style.css";
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
      {element.text}
    </div>
  );
}

/** Camada DOM dos textos; eventos passam pelo texto para o canvas. */
export function TextLayer() {
  const { elements, editingElementId } = useCanvasStore();

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
