import { useState } from "react";
import { useElementStyle } from "../../../hooks/useElementStyle";
import { BlockPicker, type ColorResult } from "react-color";
import { Divider } from "../../../ui/Divider/Divider";
import "./style.css";

const STROKE_COLORS = ["#000000", "#e03131", "#2f9e44", "#1971c2", "#f08c00"];

export function StrokeColorSelection() {
  const { property, apply, commit } = useElementStyle("stroke");
  const [showPicker, setShowPicker] = useState(false);

  function changeColor(color: string) {
    apply(color);
    commit();
  }

  function handlePickerChange(color: ColorResult) {
    changeColor(color.hex);
  }

  return (
    <div className="stroke-color-container">
      {STROKE_COLORS.map((color) => (
        <div
          key={color}
          className={`stroke-color-item ${!property.mixed && property.value === color ? "active" : ""}`}
        >
          <button
            className="stroke-color-button"
            onClick={() => changeColor(color)}
            style={{ backgroundColor: color }}
          />
        </div>
      ))}
      <Divider />
      <div className="stroke-color-item active">
        <button
          className="stroke-color-button"
          onClick={() => setShowPicker((v) => !v)}
          style={{
            backgroundColor: property.mixed ? "transparent" : property.value,
          }}
        />
      </div>
      {showPicker && (
        <div className="stroke-color-picker">
          <BlockPicker
            width="300px"
            triangle="hide"
            color={property.mixed ? "#000000" : property.value}
            onChange={handlePickerChange}
          />
        </div>
      )}
    </div>
  );
}
