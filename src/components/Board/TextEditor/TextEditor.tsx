import { useEffect, useRef, useState } from "react";
import styles from "./TextEditor.module.scss";
import type { Point } from "../../../lib/types";
import type { Bounds } from "../../../lib/geometry/bounds";
import { FONT_FAMILY, LINE_HEIGHT, layoutText, measureText } from "../../../lib/text";
import { worldToScreen, type Viewport } from "../../../lib/viewport";

/**
 * Onde o texto fica, em coordenadas de mundo:
 * - `free`: texto solto, alinhado à esquerda a partir de `position` (canto
 *   superior esquerdo), crescendo com o conteúdo, sem quebra automática;
 * - `label`: rótulo de forma, centralizado em `area` e quebrando linha na
 *   largura dela, igual ao `wrapText` do canvas.
 */
export type TextEditorLayout =
  | { kind: "free"; position: Point }
  | { kind: "label"; area: Bounds };

interface TextEditorProps {
  initialText: string;
  fontSize: number;
  color: string;
  layout: TextEditorLayout;
  viewport: Viewport;
  /** Chamado uma única vez, ao sair do editor, com o texto final. */
  onSubmit: (text: string) => void;
}

/**
 * <textarea> posicionado exatamente sobre o texto no canvas, para editar com
 * cursor, seleção e atalhos nativos do navegador.
 */
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
    // Enter quebra linha; Esc ou Ctrl/Cmd+Enter confirmam.
    if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      submit();
    }
  }

  const { zoom } = viewport;
  let box: Bounds;
  if (layout.kind === "free") {
    const size = measureText(text, fontSize);
    // Folga de meia letra para o cursor não ficar cortado no fim da linha.
    box = { ...layout.position, width: size.width + fontSize / 2, height: size.height };
  } else {
    // Mesma largura de quebra do canvas; a altura acompanha as linhas,
    // centralizada na área como o rótulo desenhado.
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
      }}
    />
  );
}
