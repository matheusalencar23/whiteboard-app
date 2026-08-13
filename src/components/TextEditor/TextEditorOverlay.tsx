import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../../store/useCanvasStore";
import { worldToScreen } from "../../lib/canvas/camera";
import {
  FONT_FAMILY,
  LINE_HEIGHT_RATIO,
} from "../../lib/geometry/shapes/text";
import { useTextMode } from "../../hooks/useTextMode";
import { cloneElement } from "../../lib/geometry/createElement";
import "./style.css";
import type { TextElement } from "../../lib/geometry/types";

export function TextEditorOverlay() {
  const { elements, editingElementId } = useCanvasStore();
  const el = elements.find((e) => e.id === editingElementId);

  if (!el || el.type !== "text") return null;

  return <TextEditorInput key={el.id} el={el} />;
}

function TextEditorInput({ el }: { el: TextElement }) {
  const { camera, updateElement } = useCanvasStore();
  const { finishEditing, cancelEditing } = useTextMode();

  const editorRef = useRef<HTMLDivElement>(null);
  const initialText = useRef(el.text);
  const didFinish = useRef(false);
  const [draft, setDraft] = useState(el.text);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.textContent = initialText.current;
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  const screenPos = worldToScreen(camera, { x: el.x, y: el.y });

  function commit() {
    if (didFinish.current) return;
    didFinish.current = true;
    finishEditing(el.id, draft);
  }

  function cancel() {
    if (didFinish.current) return;
    didFinish.current = true;
    cancelEditing(el.id);
  }

  function handleChange(value: string) {
    setDraft(value);
    const current = useCanvasStore
      .getState()
      .elements.find((element) => element.id === el.id);
    if (!current || current.type !== "text") return;

    const { width, height } = measureDomText(
      value || " ",
      current.fontSize * camera.zoom,
    );
    updateElement(
      current.id,
      cloneElement(current, {
        text: value,
        width: width / camera.zoom,
        height: height / camera.zoom,
      }),
    );
  }

  function handleInput(event: React.FormEvent<HTMLDivElement>) {
    handleChange(event.currentTarget.innerText);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      commit();
      editorRef.current?.blur();
      return;
    }

    if (event.key === "Enter") {
      // Evita que o browser crie um novo <div> com o estilo padrão para cada
      // linha. Um <br> preserva a mesma árvore tipográfica da Caveat.
      event.preventDefault();
      document.execCommand("insertLineBreak");
    }
  }

  return (
    <div
      className="text-editor-wrapper"
      style={{
        position: "fixed",
        left: screenPos.x,
        top: screenPos.y,
        width: Math.max(el.width * camera.zoom, 20),
        height: el.height * camera.zoom,
        transform: el.angle !== 0 ? `rotate(${el.angle}deg)` : undefined,
        transformOrigin: "center",
      }}
    >
      <div
        ref={editorRef}
        className="text-element text-editor-overlay"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onInput={handleInput}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        style={{
          width: "100%",
          height: "100%",
          fontSize: el.fontSize * camera.zoom,
          fontFamily: FONT_FAMILY,
          color: el.stroke,
          lineHeight: LINE_HEIGHT_RATIO,
        }}
      />
    </div>
  );
}

/** Mede com o mesmo motor DOM que desenha o texto, incluindo fontes web. */
function measureDomText(text: string, fontSize: number) {
  const measurer = document.createElement("div");
  measurer.textContent = text;
  Object.assign(measurer.style, {
    position: "fixed",
    left: "-9999px",
    top: "-9999px",
    visibility: "hidden",
    pointerEvents: "none",
    width: "max-content",
    whiteSpace: "pre",
    fontFamily: FONT_FAMILY,
    fontSize: `${fontSize}px`,
    lineHeight: String(LINE_HEIGHT_RATIO),
  });

  document.body.append(measurer);
  const { width, height } = measurer.getBoundingClientRect();
  measurer.remove();
  return { width: Math.max(width, 4), height };
}
