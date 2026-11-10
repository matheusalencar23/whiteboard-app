import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";
import styles from "./Modal.module.scss";
import { IconButton } from "../IconButton/IconButton";

interface ModalProps {
  title: string;
  onClose: () => void;
  closeKeys?: string[];
  className?: string;
  children: React.ReactNode;
}

const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function trapFocus(e: React.KeyboardEvent, container: HTMLElement) {
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (focusable.length === 0) {
    e.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === container)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

export function Modal({ title, onClose, closeKeys = ["Escape"], className, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous !== document.body) previous.focus();
    };
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation();
    if (closeKeys.includes(e.key)) {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab" && dialogRef.current) {
      trapFocus(e, dialogRef.current);
    }
  }

  return createPortal(
    <div
      className={styles.backdrop}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={className ? `${styles.dialog} ${className}` : styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton icon={LuX} label="Fechar" shortcut="Esc" size="sm" tooltipSide="bottom" onClick={onClose} />
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
