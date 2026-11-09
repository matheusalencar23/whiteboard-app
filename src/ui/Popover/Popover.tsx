import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Popover.module.scss";

interface PopoverProps {
  anchor: HTMLElement;
  onClose: () => void;
  children: React.ReactNode;
}

const GAP = 8;
const VIEWPORT_MARGIN = 8;

export function Popover({ anchor, onClose, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(() => anchor.getBoundingClientRect().bottom + GAP);
  const left = anchor.getBoundingClientRect().left;

  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 0;
    const rect = anchor.getBoundingClientRect();
    const below = rect.bottom + GAP;
    const fitsBelow = below + height <= window.innerHeight - VIEWPORT_MARGIN;
    setTop(fitsBelow ? below : Math.max(VIEWPORT_MARGIN, rect.top - GAP - height));
  }, [anchor]);

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
    <div ref={ref} className={styles.popover} style={{ left, top }}>
      {children}
    </div>,
    document.body,
  );
}
