import { useCallback, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { LuMonitor, LuMoon, LuSun } from "react-icons/lu";
import styles from "./ThemeMenu.module.scss";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { Menu, type MenuEntry } from "../../../ui/Menu/Menu";
import { useBoardStore } from "../../../store/boardStoreContext";
import type { ThemeMode } from "../../../lib/theme";
import { useColorScheme } from "../../useColorScheme";
import { SHORTCUTS, formatShortcut } from "../shortcuts";
import { useMessages } from "../../../i18n/useMessages";

const MODE_OPTIONS: { mode: ThemeMode; icon: IconType }[] = [
  { mode: "light", icon: LuSun },
  { mode: "dark", icon: LuMoon },
  { mode: "system", icon: LuMonitor },
];

export function ThemeMenu() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);
  const themeMode = useBoardStore((s) => s.themeMode);
  const setThemeMode = useBoardStore((s) => s.setThemeMode);
  const scheme = useColorScheme();
  const messages = useMessages();

  const entries: MenuEntry[] = MODE_OPTIONS.map(({ mode, icon }) => ({
    id: mode,
    label: messages.theme[mode],
    icon,
    checked: themeMode === mode,
    onSelect: () => setThemeMode(mode),
  }));

  return (
    <div ref={anchorRef} className={styles.button}>
      <IconButton
        icon={scheme === "dark" ? LuMoon : LuSun}
        label={messages.theme.menu}
        shortcut={formatShortcut(SHORTCUTS.toggleTheme.keys)}
        size="sm"
        tooltipSide="top"
        hasPopup
        popupRole="menu"
        active={anchor !== null}
        onClick={() => setAnchor((open) => (open ? null : anchorRef.current))}
      />
      {anchor && <Menu label={messages.theme.menu} anchor={anchor} entries={entries} onClose={close} />}
    </div>
  );
}
