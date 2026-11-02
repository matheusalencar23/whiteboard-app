import type { Point } from "../../types";
import { containsPoint, expandBounds } from "../../geometry/bounds";
import { DEFAULT_FONT_SIZE, LINE_HEIGHT, fontString, measureText } from "../../text";
import { baseFields, type ShapeUtil } from "../shapeUtil";
import type { TextElement } from "../types";

/** `position` é o canto superior esquerdo, em coordenadas de mundo. */
export function createText(position: Point, text = "", fontSize = DEFAULT_FONT_SIZE): TextElement {
  const size = measureText(text, fontSize);
  return { ...baseFields({ ...position, ...size }), type: "text", text, fontSize };
}

/** Troca o conteúdo e recalcula o tamanho. */
export function setText(el: TextElement, text: string): TextElement {
  return { ...el, text, ...measureText(text, el.fontSize) };
}

export const textUtil: ShapeUtil<TextElement> = {
  draw(el, _rc, ctx) {
    ctx.save();
    ctx.font = fontString(el.fontSize);
    ctx.fillStyle = el.style.strokeColor;
    // "middle" no centro de cada linha bate com o alinhamento do <textarea>
    // de edição, que usa o mesmo line-height.
    ctx.textBaseline = "middle";
    const lineHeight = el.fontSize * LINE_HEIGHT;
    el.text.split("\n").forEach((line, i) => {
      ctx.fillText(line, el.x, el.y + lineHeight * (i + 0.5));
    });
    ctx.restore();
  },

  hitTest(el, p, tolerance) {
    return containsPoint(expandBounds(el, tolerance), p);
  },

  // Texto não deforma: o redimensionamento escala a fonte pela altura.
  resize(el, bounds) {
    const scale = el.height === 0 ? 1 : bounds.height / el.height;
    const fontSize = Math.max(1, el.fontSize * scale);
    return { ...el, x: bounds.x, y: bounds.y, fontSize, ...measureText(el.text, fontSize) };
  },
};
