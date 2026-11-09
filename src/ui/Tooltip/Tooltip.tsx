import { useLayoutEffect, useRef, useState } from "react";
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

const OPPOSITE: Record<TooltipSide, TooltipSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function fitsInViewport(rect: DOMRect): boolean {
  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
}

export function Tooltip({ anchor, side, label, shortcut }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [placedSide, setPlacedSide] = useState(side);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && placedSide === side && !fitsInViewport(el.getBoundingClientRect())) {
      setPlacedSide(OPPOSITE[side]);
    }
  }, [placedSide, side]);

  return createPortal(
    <div ref={ref} className={styles.tooltip} role="tooltip" style={position(anchor, placedSide)}>
      <span>{label}</span>
      {shortcut && <kbd className={styles.shortcut}>{shortcut}</kbd>}
    </div>,
    document.body,
  );
}
