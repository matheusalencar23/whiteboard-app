import { useElementStyle } from "../../../hooks/useElementStyle";
import "./style.css";

export function StrokeWidthSlider() {
  const { property, apply, commit } = useElementStyle("strokeWidth");
  const displayValue = property.mixed ? 1 : property.value;

  return (
    <div className="stroke-width-container">
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={displayValue}
        className={property.mixed ? "mixed" : ""}
        onChange={(e) => apply(Number(e.target.value))}
        onPointerUp={commit}
      />
    </div>
  );
}
