import { useEffect, useRef, useState } from "react";
import styles from "./TextEditor.module.scss";
import type { Point } from "../../../lib/types";
import type { Bounds } from "../../../lib/geometry/bounds";
import { FONT_FAMILY, LINE_HEIGHT, layoutText, measureText } from "../../../lib/text";
import { worldToScreen, type Viewport } from "../../../lib/viewport";

export type TextEditorLayout =
  | { kind: "free"; position: Point; rotation: number }
  | { kind: "label"; area: Bounds; rotation: number };

interface TextEditorProps {
  initialText: string;
  fontSize: number;
  color: string;
  layout: TextEditorLayout;
  viewport: Viewport;
  onSubmit: (text: string) => void;
}

export function TextEditor({
  initialText,
  fontSize,
  color,
  layout,
  viewport,
  onSubmit,
}: TextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const submittedRef = useRef(false);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.focus();
    textarea.select();
  }, []);

  function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      submit();
    }
  }

  const { zoom } = viewport;
  let box: Bounds;
  if (layout.kind === "free") {
    const size = measureText(text, fontSize);
    box = { ...layout.position, width: size.width + fontSize / 2, height: size.height };
  } else {
    const { area } = layout;
    const { height } = layoutText(text, fontSize, area.width);
    box = { x: area.x, y: area.y + (area.height - height) / 2, width: area.width, height };
  }
  const position = worldToScreen(box, viewport);

  return (
    <textarea
      ref={ref}
      className={styles.editor}
      data-layout={layout.kind}
      value={text}
      wrap={layout.kind === "free" ? "off" : "soft"}
      spellCheck={false}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={submit}
      style={{
        left: position.x,
        top: position.y,
        width: box.width * zoom,
        height: box.height * zoom,
        fontSize: fontSize * zoom,
        fontFamily: FONT_FAMILY,
        lineHeight: LINE_HEIGHT,
        color,
        transform: layout.rotation === 0 ? undefined : `rotate(${layout.rotation}rad)`,
        transformOrigin: layout.kind === "free" ? "0 0" : "50% 50%",
      }}
    />
  );
}
