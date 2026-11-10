import type { Point } from "../../types";
import { containsPoint, expandBounds, getCenter } from "../../geometry/bounds";
import { rotatePoint } from "../../geometry/distance";
import { alignedX, fontString, lineHeight, measureText } from "../../text";
import { baseFields, type ShapeUtil } from "../shapeUtil";
import type { BoardElement, TextElement, TextStyle } from "../types";

export function resolveTextColor(textStyle: TextStyle, element: BoardElement): string {
  return textStyle.color ?? element.style.strokeColor;
}

export function createText(position: Point, textStyle: TextStyle, text = ""): TextElement {
  const size = measureText(text, textStyle);
  return { ...baseFields({ ...position, ...size }), type: "text", text, textStyle };
}

export function setText(el: TextElement, text: string, textStyle = el.textStyle): TextElement {
  const size = measureText(text, textStyle);
  if (el.rotation === 0) return { ...el, text, textStyle, ...size };

  const corner = rotatePoint({ x: el.x, y: el.y }, getCenter(el), el.rotation);
  const half = rotatePoint({ x: size.width / 2, y: size.height / 2 }, { x: 0, y: 0 }, el.rotation);
  const center = { x: corner.x + half.x, y: corner.y + half.y };
  return {
    ...el,
    text,
    textStyle,
    ...size,
    x: center.x - size.width / 2,
    y: center.y - size.height / 2,
  };
}

export const textUtil: ShapeUtil<TextElement> = {
  draw(el, _rc, ctx) {
    const { textStyle } = el;
    const step = lineHeight(textStyle);
    const x = alignedX(textStyle.align, el.x, el.width);
    ctx.save();
    ctx.font = fontString(textStyle);
    ctx.fillStyle = resolveTextColor(textStyle, el);
    ctx.textAlign = textStyle.align;
    ctx.textBaseline = "middle";
    el.text.split("\n").forEach((line, i) => {
      ctx.fillText(line, x, el.y + step * (i + 0.5));
    });
    ctx.restore();
  },

  hitTest(el, p, tolerance) {
    return containsPoint(expandBounds(el, tolerance), p);
  },

  resize(el, bounds) {
    const scale = el.height === 0 ? 1 : bounds.height / el.height;
    const textStyle = { ...el.textStyle, fontSize: Math.max(1, el.textStyle.fontSize * scale) };
    return { ...el, x: bounds.x, y: bounds.y, textStyle, ...measureText(el.text, textStyle) };
  },
};
