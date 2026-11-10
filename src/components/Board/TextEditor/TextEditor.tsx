import { useEffect, useRef, useState } from "react";
import styles from "./TextEditor.module.scss";
import type { Point } from "../../../lib/types";
import type { Bounds } from "../../../lib/geometry/bounds";
import type { TextStyle } from "../../../lib/elements/types";
import { FONT_STACKS, LINE_HEIGHT, layoutText, measureText } from "../../../lib/text";
import { worldToScreen, type Viewport } from "../../../lib/viewport";

export type TextEditorLayout =
  | { kind: "free"; position: Point; rotation: number }
  | { kind: "label"; area: Bounds; rotation: number };

interface TextEditorProps {
  initialText: string;
  textStyle: TextStyle;
  color: string;
  layout: TextEditorLayout;
  viewport: Viewport;
  onChange?: (text: string) => void;
  onSubmit: (text: string) => void;
}

export function TextEditor({
  initialText,
  textStyle,
  color,
  layout,
  viewport,
  onChange,
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
  const { fontSize } = textStyle;
  let box: Bounds;
  if (layout.kind === "free") {
    const size = measureText(text, textStyle);
    const caretRoom = fontSize / 2;
    const shift = textStyle.align === "center" ? caretRoom / 2 : textStyle.align === "right" ? caretRoom : 0;
    box = { x: layout.position.x - shift, y: layout.position.y, width: size.width + caretRoom, height: size.height };
  } else {
    const { area } = layout;
    const { height } = layoutText(text, textStyle, area.width);
    const offset =
      textStyle.verticalAlign === "top"
        ? 0
        : textStyle.verticalAlign === "bottom"
          ? area.height - height
          : (area.height - height) / 2;
    box = { x: area.x, y: area.y + offset, width: area.width, height };
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
      onChange={(e) => {
        setText(e.target.value);
        onChange?.(e.target.value);
      }}
      onKeyDown={handleKeyDown}
      onBlur={submit}
      style={{
        left: position.x,
        top: position.y,
        width: box.width * zoom,
        height: box.height * zoom,
        fontSize: fontSize * zoom,
        fontFamily: FONT_STACKS[textStyle.fontFamily],
        fontWeight: textStyle.bold ? 700 : 400,
        fontStyle: textStyle.italic ? "italic" : "normal",
        textAlign: textStyle.align,
        lineHeight: LINE_HEIGHT,
        color,
        transform: layout.rotation === 0 ? undefined : `rotate(${layout.rotation}rad)`,
        transformOrigin: layout.kind === "free" ? "0 0" : "50% 50%",
      }}
    />
  );
}
