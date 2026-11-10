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

interface Position {
  left: number;
  top: number;
}

const GAP = 8;
const VIEWPORT_MARGIN = 8;

function preferredPosition(anchor: HTMLElement, side: PopoverSide, boundary: HTMLElement | null): Position {
  const rect = anchor.getBoundingClientRect();
  if (side === "right") {
    const edge = (boundary ?? anchor).getBoundingClientRect().right;
    return { left: edge + GAP, top: rect.top };
  }
  return { left: rect.left, top: rect.bottom + GAP };
}

function fitToViewport(
  anchor: HTMLElement,
  side: PopoverSide,
  boundary: HTMLElement | null,
  size: { width: number; height: number },
): Position {
  const preferred = preferredPosition(anchor, side, boundary);
  const rect = anchor.getBoundingClientRect();
  const right = window.innerWidth - VIEWPORT_MARGIN;
  const bottom = window.innerHeight - VIEWPORT_MARGIN;

  let { left, top } = preferred;
  if (left + size.width > right) {
    left =
      side === "right"
        ? (boundary ?? anchor).getBoundingClientRect().left - GAP - size.width
        : right - size.width;
  }
  if (top + size.height > bottom) {
    top = side === "right" ? bottom - size.height : rect.top - GAP - size.height;
  }
  return { left: Math.max(VIEWPORT_MARGIN, left), top: Math.max(VIEWPORT_MARGIN, top) };
}

export function Popover({ anchor, side = "bottom", boundary = null, onClose, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pointerInsideRef = useRef(false);
  const [position, setPosition] = useState(() => preferredPosition(anchor, side, boundary));

  useLayoutEffect(() => {
    const size = { width: ref.current?.offsetWidth ?? 0, height: ref.current?.offsetHeight ?? 0 };
    setPosition(fitToViewport(anchor, side, boundary, size));
  }, [anchor, side, boundary]);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const inside = pointerInsideRef.current || anchor.contains(e.target as Node);
      pointerInsideRef.current = false;
      if (!inside) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={ref}
      className={styles.popover}
      style={position}
      onPointerDownCapture={() => {
        pointerInsideRef.current = true;
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
