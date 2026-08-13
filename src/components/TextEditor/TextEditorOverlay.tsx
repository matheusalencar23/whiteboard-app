import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../../store/useCanvasStore";
import { worldToScreen } from "../../lib/canvas/camera";
import {
  FONT_FAMILY,
  LINE_HEIGHT_RATIO,
  measureText,
} from "../../lib/geometry/shapes/text";
import { useTextMode } from "../../hooks/useTextMode";
import { cloneElement } from "../../lib/geometry/createElement";
import type { TextElement } from "../../lib/geometry/types";
import "./style.css";
import "../TextLayer/style.css";

export function TextEditorOverlay() {
  const { elements, editingElementId } = useCanvasStore();
  const element = elements.find((item) => item.id === editingElementId);

  if (!element || element.type !== "text") return null;
  return <TextEditorInput key={element.id} element={element} />;
}

function TextEditorInput({ element }: { element: TextElement }) {
  const { camera, updateElement } = useCanvasStore();
  const { finishEditing, cancelEditing } = useTextMode();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const didFinish = useRef(false);
  const [draft, setDraft] = useState(element.text);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const screenPosition = worldToScreen(camera, { x: element.x, y: element.y });

  function commit() {
    if (didFinish.current) return;
    didFinish.current = true;
    finishEditing(element.id, draft);
  }

  function cancel() {
    if (didFinish.current) return;
    didFinish.current = true;
    cancelEditing(element.id);
  }

  function handleChange(value: string) {
    setDraft(value);
    const current = useCanvasStore
      .getState()
      .elements.find((item) => item.id === element.id);
    if (!current || current.type !== "text") return;

    const { width, height } = measureText(value || " ", current.fontSize);
    updateElement(current.id, cloneElement(current, { text: value, width, height }));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      commit();
      textareaRef.current?.blur();
    }
  }

  return (
    <div
      className="text-editor-wrapper"
      style={{
        position: "fixed",
        left: screenPosition.x,
        top: screenPosition.y,
        width: Math.max(element.width * camera.zoom, 20),
        height: element.height * camera.zoom,
        transform: element.angle ? `rotate(${element.angle}deg)` : undefined,
        transformOrigin: "center",
      }}
    >
      <div
        className="text-element text-editor-preview"
        aria-hidden="true"
        style={{
          fontSize: element.fontSize * camera.zoom,
          fontFamily: FONT_FAMILY,
          color: element.stroke,
          lineHeight: LINE_HEIGHT_RATIO,
        }}
      >
        {renderText(draft)}
      </div>
      <textarea
        ref={textareaRef}
        className="text-editor-overlay"
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        aria-label="Editar texto"
        style={{
          fontSize: element.fontSize * camera.zoom,
          fontFamily: FONT_FAMILY,
          lineHeight: LINE_HEIGHT_RATIO,
          caretColor: element.stroke,
        }}
      />
    </div>
  );
}

/** Mantém uma última linha vazia visível após uma quebra final. */
function renderText(text: string) {
  return text.endsWith("\n") ? `${text}\u200B` : text || "\u200B";
}
