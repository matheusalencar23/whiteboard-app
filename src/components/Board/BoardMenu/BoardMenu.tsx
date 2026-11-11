import { useCallback, useRef, useState } from "react";
import { LuDownload, LuFolderOpen, LuImageDown, LuMenu, LuPencil } from "react-icons/lu";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { Menu, type MenuEntry } from "../../../ui/Menu/Menu";
import { useBoardStore } from "../../../store/boardStore";
import { SHORTCUTS, formatShortcut } from "../shortcuts";
import { exportBoard, importBoard } from "../boardFileActions";

const MENU_LABEL = "Menu do board";

interface BoardMenuProps {
  onRename: () => void;
}

export function BoardMenu({ onRename }: BoardMenuProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);

  const entries: MenuEntry[] = [
    {
      id: "open",
      label: SHORTCUTS.openFile.label,
      icon: LuFolderOpen,
      shortcut: formatShortcut(SHORTCUTS.openFile.keys),
      onSelect: () => void importBoard(),
    },
    {
      id: "save",
      label: SHORTCUTS.saveFile.label,
      icon: LuDownload,
      shortcut: formatShortcut(SHORTCUTS.saveFile.keys),
      onSelect: exportBoard,
    },
    {
      id: "export",
      label: SHORTCUTS.exportImage.label,
      icon: LuImageDown,
      shortcut: formatShortcut(SHORTCUTS.exportImage.keys),
      onSelect: () => useBoardStore.getState().setExportOpen(true),
    },
    "separator",
    { id: "rename", label: "Renomear", icon: LuPencil, onSelect: onRename },
  ];

  return (
    <div ref={anchorRef}>
      <IconButton
        icon={LuMenu}
        label={MENU_LABEL}
        size="sm"
        tooltipSide="bottom"
        hasPopup
        popupRole="menu"
        active={anchor !== null}
        onClick={() => setAnchor((open) => (open ? null : anchorRef.current))}
      />
      {anchor && <Menu label={MENU_LABEL} anchor={anchor} entries={entries} onClose={close} />}
    </div>
  );
}
