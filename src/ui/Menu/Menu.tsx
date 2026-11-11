import { useEffect, useRef } from "react";
import type { IconType } from "react-icons";
import styles from "./Menu.module.scss";
import { Popover } from "../Popover/Popover";

export interface MenuItem {
  id: string;
  label: string;
  icon: IconType;
  shortcut?: string;
  onSelect: () => void;
}

export type MenuEntry = MenuItem | "separator";

interface MenuProps {
  label: string;
  anchor: HTMLElement;
  entries: MenuEntry[];
  onClose: () => void;
}

const NAVIGATION_KEYS = ["ArrowDown", "ArrowUp", "Home", "End"];

function nextIndex(key: string, current: number, count: number): number {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (current === -1) return key === "ArrowUp" ? count - 1 : 0;
  return (current + (key === "ArrowUp" ? -1 : 1) + count) % count;
}

export function Menu({ label, anchor, entries, onClose }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  function closeAndRefocus() {
    onClose();
    anchor.querySelector<HTMLElement>("button")?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      closeAndRefocus();
      return;
    }
    if (!NAVIGATION_KEYS.includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const current = items.indexOf(document.activeElement as HTMLElement);
    items[nextIndex(e.key, current, items.length)]?.focus();
  }

  return (
    <Popover anchor={anchor} onClose={onClose}>
      <div ref={ref} className={styles.menu} role="menu" aria-label={label} tabIndex={-1} onKeyDown={handleKeyDown}>
        {entries.map((entry, index) =>
          entry === "separator" ? (
            <span key={`separator-${index}`} className={styles.separator} role="separator" />
          ) : (
            <button
              key={entry.id}
              type="button"
              role="menuitem"
              className={styles.item}
              onClick={() => {
                onClose();
                entry.onSelect();
              }}
            >
              <entry.icon className={styles.icon} aria-hidden="true" />
              <span className={styles.label}>{entry.label}</span>
              {entry.shortcut && <kbd className={styles.shortcut}>{entry.shortcut}</kbd>}
            </button>
          ),
        )}
      </div>
    </Popover>
  );
}
