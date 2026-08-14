import { useRef, useState } from "react";
import { useCanvasStore } from "../../../store/useCanvasStore";
import { useSelectedElements } from "../../../hooks/useSelectedElements";
import { cloneElement } from "../../../lib/geometry/createElement";
import type {
  CanvasElement,
  RectangleElement,
  EllipseElement,
} from "../../../lib/geometry/types";
import "./style.css";
import { Divider } from "../../../ui/Divider/Divider";
import { BlockPicker, type ColorResult } from "react-color";

const FILL_COLORS = ["#e03131", "#2f9e44", "#1971c2", "#f08c00"];

type Fillable = RectangleElement | EllipseElement;
function isFillable(el: CanvasElement): el is Fillable {
  return el.type === "rectangle" || el.type === "ellipse";
}

export function FillColorSelection() {
  const { selected } = useSelectedElements();
  const { updateElement, commitHistory } = useCanvasStore();
  const beforeSnapshot = useRef<CanvasElement[] | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const fillable = selected.filter(isFillable);
  if (fillable.length === 0) return null;

  const first = fillable[0].fill;
  const mixed = !fillable.every((el) => el.fill === first);

  function changeFill(fill: string | null) {
    beforeSnapshot.current = useCanvasStore.getState().elements;
    fillable.forEach((el) => updateElement(el.id, cloneElement(el, { fill })));
    commitHistory(beforeSnapshot.current);
  }

  function handlePickerChange(color: ColorResult) {
    console.log("teste", color)
    changeFill(color.hex);
  }

  return (
    <div className="fill-color-container">
      <div
        className={`fill-color-item ${!mixed && first === null ? "active" : ""}`}
      >
        <button
          className="fill-color-button fill-none"
          onClick={() => changeFill(null)}
          title="Sem preenchimento"
        />
      </div>
      {FILL_COLORS.map((color) => (
        <div
          key={color}
          className={`fill-color-item ${!mixed && first === color ? "active" : ""}`}
        >
          <button
            className={`fill-color-button ${!mixed && first === color ? "active" : ""}`}
            style={{ backgroundColor: color }}
            onClick={() => changeFill(color)}
          />
        </div>
      ))}
      <Divider />
      <div className="stroke-color-item active">
        <button
          className="stroke-color-button"
          onClick={() => setShowPicker((v) => !v)}
          style={{
            backgroundColor: !mixed && first ? first : "transparent",
          }}
        />
      </div>
      {showPicker && (
        <div className="stroke-color-picker">
          <BlockPicker
            width="300px"
            triangle="hide"
            color={!mixed && first ? first : ""}
            onChange={handlePickerChange}
          />
        </div>
      )}
    </div>
  );
}
