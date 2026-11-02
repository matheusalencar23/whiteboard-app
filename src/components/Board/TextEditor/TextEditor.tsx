import { useEffect, useRef, useState } from "react";
import styles from "./TextEditor.module.scss";
import type { TextElement } from "../../../lib/elements/types";
import { FONT_FAMILY, LINE_HEIGHT, measureText } from "../../../lib/text";
import { worldToScreen, type Viewport } from "../../../lib/viewport";

interface TextEditorProps {
  element: TextElement;
  viewport: Viewport;
  /** Chamado uma única vez, ao sair do editor, com o texto final. */
  onSubmit: (text: string) => void;
}

/**
 * <textarea> posicionado exatamente sobre o texto no canvas, para editar com
 * cursor, seleção e atalhos nativos do navegador.
 */
export function TextEditor({ element, viewport, onSubmit }: TextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const submittedRef = useRef(false);
  const [text, setText] = useState(element.text);

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
    // Enter quebra linha; Esc ou Ctrl/Cmd+Enter confirmam.
    if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      submit();
    }
  }

  const { zoom } = viewport;
  const position = worldToScreen(element, viewport);
  const size = measureText(text, element.fontSize);

  return (
    <textarea
      ref={ref}
      className={styles.editor}
      value={text}
      wrap="off"
      spellCheck={false}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={submit}
      style={{
        left: position.x,
        top: position.y,
        // Folga de meia letra para o cursor não ficar cortado no fim da linha.
        width: (size.width + element.fontSize / 2) * zoom,
        height: size.height * zoom,
        fontSize: element.fontSize * zoom,
        fontFamily: FONT_FAMILY,
        lineHeight: LINE_HEIGHT,
        color: element.style.strokeColor,
      }}
    />
  );
}
