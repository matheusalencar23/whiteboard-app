import { useEffect, useRef } from "react";
import { useCanvasStore } from "../../store/useCanvasStore";
import { worldToScreen } from "../../lib/canvas/camera";
import { FONT_FAMILY, measureText } from "../../lib/geometry/shapes/text";
import { useTextMode } from "../../hooks/useTextMode";
import "./style.css";
import type { TextElement } from "../../lib/geometry/types";
import { cloneElement } from "../../lib/geometry/createElement";

export function TextEditorOverlay() {
  const { elements, editingElementId } = useCanvasStore();
  const el = elements.find((e) => e.id === editingElementId);

  if (!el || el.type !== "text") return null;

  return <TextEditorInput key={el.id} el={el} />;
}

function TextEditorInput({ el }: { el: TextElement }) {
  const { camera, updateElement } = useCanvasStore();
  const { finishEditing } = useTextMode();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const screenPos = worldToScreen(camera, { x: el.x, y: el.y });

  function handleChange(value: string) {
    const { width, height } = measureText(value || " ", el.fontSize);
    updateElement(el.id, cloneElement(el, { text: value, width, height }));
  }

  function commit() {
    finishEditing(el.id, el.text);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      commit();
    }
  }

  return (
    <textarea
      ref={textareaRef}
      className="text-editor-overlay"
      value={el.text}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      style={{
        left: screenPos.x,
        top: screenPos.y,
        fontSize: el.fontSize * camera.zoom,
        fontFamily: FONT_FAMILY,
        color: el.stroke,
        width: Math.max(el.width * camera.zoom, 20),
        height: el.height * camera.zoom,
        transform: el.angle !== 0 ? `rotate(${el.angle}deg)` : undefined,
        transformOrigin: "top left",
      }}
    ></textarea>
  );
}
