import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Popover.module.scss";

export type PopoverSide = "bottom" | "right";

interface PopoverProps {
  anchor: HTMLElement;
  side?: PopoverSide;
  boundary?: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
}

function initialPosition(anchor: HTMLElement, side: PopoverSide, boundary: HTMLElement | null) {
  const rect = anchor.getBoundingClientRect();
  if (side === "right") {
    const edge = (boundary ?? anchor).getBoundingClientRect().right;
    return { left: edge + GAP, top: rect.top };
  }
  return { left: rect.left, top: rect.bottom + GAP };
}

function fitVertically(anchor: HTMLElement, side: PopoverSide, top: number, height: number) {
  const limit = window.innerHeight - VIEWPORT_MARGIN;
  if (top + height <= limit) return top;
  if (side === "right") return Math.max(VIEWPORT_MARGIN, limit - height);
  return Math.max(VIEWPORT_MARGIN, anchor.getBoundingClientRect().top - GAP - height);
}

const GAP = 8;
const VIEWPORT_MARGIN = 8;

export function Popover({ anchor, side = "bottom", boundary = null, onClose, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(() => initialPosition(anchor, side, boundary));

  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 0;
    const next = initialPosition(anchor, side, boundary);
    setPosition({ ...next, top: fitVertically(anchor, side, next.top, height) });
  }, [anchor, side, boundary]);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div ref={ref} className={styles.popover} style={position}>
      {children}
    </div>,
    document.body,
  );
}
