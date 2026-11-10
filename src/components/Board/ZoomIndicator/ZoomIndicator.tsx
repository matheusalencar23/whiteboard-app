import { useState } from "react";
import { LuMinus, LuPlus } from "react-icons/lu";
import styles from "./ZoomIndicator.module.scss";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { Tooltip } from "../../../ui/Tooltip/Tooltip";
import { useBoardStore } from "../../../store/boardStore";
import { MAX_ZOOM, MIN_ZOOM } from "../../../lib/viewport";

export function ZoomIndicator() {
  const zoom = useBoardStore((s) => s.viewport.zoom);
  const stepZoom = useBoardStore((s) => s.stepZoom);
  const resetZoom = useBoardStore((s) => s.resetZoom);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  function showTooltip(e: React.SyntheticEvent<HTMLButtonElement>) {
    setAnchor(e.currentTarget.getBoundingClientRect());
  }

  return (
    <div className={styles.zoom} role="group" aria-label="Zoom">
      <IconButton
        icon={LuMinus}
        label="Diminuir zoom"
        shortcut="Ctrl −"
        size="sm"
        tooltipSide="top"
        disabled={zoom <= MIN_ZOOM}
        onClick={() => stepZoom(-1)}
      />
      <button
        type="button"
        className={styles.value}
        aria-label={`Zoom em ${Math.round(zoom * 100)}%, voltar a 100%`}
        onPointerEnter={showTooltip}
        onPointerLeave={() => setAnchor(null)}
        onFocus={showTooltip}
        onBlur={() => setAnchor(null)}
        onClick={(e) => {
          resetZoom();
          e.currentTarget.blur();
        }}
      >
        {Math.round(zoom * 100)}%
      </button>
      {anchor && <Tooltip anchor={anchor} side="top" label="Voltar a 100%" shortcut="Ctrl 0" />}
      <IconButton
        icon={LuPlus}
        label="Aumentar zoom"
        shortcut="Ctrl +"
        size="sm"
        tooltipSide="top"
        disabled={zoom >= MAX_ZOOM}
        onClick={() => stepZoom(1)}
      />
    </div>
  );
}
