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

const VIEWPORT_MARGIN = 8;

function isVertical(side: TooltipSide): boolean {
  return side === "top" || side === "bottom";
}

function fitsOnSide(rect: DOMRect, side: TooltipSide): boolean {
  if (isVertical(side)) return rect.top >= 0 && rect.bottom <= window.innerHeight;
  return rect.left >= 0 && rect.right <= window.innerWidth;
}

function overflowShift(start: number, end: number, limit: number): number {
  if (start < VIEWPORT_MARGIN) return VIEWPORT_MARGIN - start;
  if (end > limit - VIEWPORT_MARGIN) return limit - VIEWPORT_MARGIN - end;
  return 0;
}

function crossAxisShift(rect: DOMRect, side: TooltipSide): { x: number; y: number } {
  if (isVertical(side)) return { x: overflowShift(rect.left, rect.right, window.innerWidth), y: 0 };
  return { x: 0, y: overflowShift(rect.top, rect.bottom, window.innerHeight) };
}

export function Tooltip({ anchor, side, label, shortcut }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [placedSide, setPlacedSide] = useState(side);
  const [shift, setShift] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || shift) return;
    const rect = el.getBoundingClientRect();
    if (placedSide === side && !fitsOnSide(rect, side)) {
      setPlacedSide(OPPOSITE[side]);
      return;
    }
    setShift(crossAxisShift(rect, placedSide));
  }, [placedSide, side, shift]);

  const style = { ...position(anchor, placedSide), marginLeft: shift?.x, marginTop: shift?.y };

  return createPortal(
    <div ref={ref} className={styles.tooltip} role="tooltip" style={style}>
      <span>{label}</span>
      {shortcut && <kbd className={styles.shortcut}>{shortcut}</kbd>}
    </div>,
    document.body,
  );
}
