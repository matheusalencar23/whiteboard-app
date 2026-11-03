import { createPortal } from "react-dom";
import styles from "./Tooltip.module.scss";

export type TooltipSide = "top" | "right" | "bottom" | "left";

interface TooltipProps {
  anchor: DOMRect;
  side: TooltipSide;
  label: string;
  shortcut?: string;
}

const GAP = 8;

function position(anchor: DOMRect, side: TooltipSide): React.CSSProperties {
  switch (side) {
    case "right":
      return { left: anchor.right + GAP, top: anchor.top + anchor.height / 2, translate: "0 -50%" };
    case "left":
      return { left: anchor.left - GAP, top: anchor.top + anchor.height / 2, translate: "-100% -50%" };
    case "top":
      return { left: anchor.left + anchor.width / 2, top: anchor.top - GAP, translate: "-50% -100%" };
    case "bottom":
      return { left: anchor.left + anchor.width / 2, top: anchor.bottom + GAP, translate: "-50% 0" };
  }
}

export function Tooltip({ anchor, side, label, shortcut }: TooltipProps) {
  return createPortal(
    <div className={styles.tooltip} role="tooltip" style={position(anchor, side)}>
      <span>{label}</span>
      {shortcut && <kbd className={styles.shortcut}>{shortcut}</kbd>}
    </div>,
    document.body,
  );
}
