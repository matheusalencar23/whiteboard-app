import { useCallback, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { LuMonitor, LuMoon, LuSun } from "react-icons/lu";
import styles from "./ThemeMenu.module.scss";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { Menu, type MenuEntry } from "../../../ui/Menu/Menu";
import { useBoardStore } from "../../../store/boardStore";
import type { ThemeMode } from "../../../lib/theme";
import { useColorScheme } from "../../useColorScheme";
import { SHORTCUTS, formatShortcut } from "../shortcuts";

const MENU_LABEL = "Tema";

const MODE_OPTIONS: { mode: ThemeMode; label: string; icon: IconType }[] = [
  { mode: "light", label: "Claro", icon: LuSun },
  { mode: "dark", label: "Escuro", icon: LuMoon },
  { mode: "system", label: "Seguir o sistema", icon: LuMonitor },
];

export function ThemeMenu() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);
  const themeMode = useBoardStore((s) => s.themeMode);
  const setThemeMode = useBoardStore((s) => s.setThemeMode);
  const scheme = useColorScheme();

  const entries: MenuEntry[] = MODE_OPTIONS.map(({ mode, label, icon }) => ({
    id: mode,
    label,
    icon,
    checked: themeMode === mode,
    onSelect: () => setThemeMode(mode),
  }));

  return (
    <div ref={anchorRef} className={styles.button}>
      <IconButton
        icon={scheme === "dark" ? LuMoon : LuSun}
        label={MENU_LABEL}
        shortcut={formatShortcut(SHORTCUTS.toggleTheme.keys)}
        size="sm"
        tooltipSide="top"
        hasPopup
        popupRole="menu"
        active={anchor !== null}
        onClick={() => setAnchor((open) => (open ? null : anchorRef.current))}
      />
      {anchor && <Menu label={MENU_LABEL} anchor={anchor} entries={entries} onClose={close} />}
    </div>
  );
}
