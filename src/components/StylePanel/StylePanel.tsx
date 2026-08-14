import { useSelectedElements } from "../../hooks/useSelectedElements";
import { Divider } from "../../ui/Divider/Divider";
import { FillColorSelection } from "./FillColorSelection/FillColorSelection";
import { StrokeColorSelection } from "./StrokeColorSelection/StrokeColorSelection";
import { StrokeWidthSlider } from "./StrokeWidthSlider/StrokeWidthSlider";
import "./style.css";

export function StylePanel() {
  const { selected } = useSelectedElements();
  if (selected.length === 0) return null;

  const hasFillable = selected.some(
    (el) => el.type === "rectangle" || el.type === "ellipse",
  );
  const hasText = selected.some((el) => el.type === "text");
  const hasArrow = selected.some((el) => el.type === "arrow");

  return (
    <div className="style-panel">
      <div className="style-panel-title">Traço</div>
      <StrokeColorSelection />

      <div className="style-panel-title">Espessura</div>
      <StrokeWidthSlider />

      {hasFillable && (
        <>
          <div className="style-panel-title">Preenchimento</div>
          <FillColorSelection />
        </>
      )}
    </div>
  );
}
