import { useCallback, useRef, useState } from "react";
import { LuDownload, LuFolderOpen, LuImageDown, LuMenu, LuPencil } from "react-icons/lu";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { Menu, type MenuEntry } from "../../../ui/Menu/Menu";
import { useBoardStore, useBoardStoreApi } from "../../../store/boardStoreContext";
import { SHORTCUTS, formatShortcut } from "../shortcuts";
import { exportBoard, importBoard } from "../boardFileActions";
import { useMessages } from "../../../i18n/useMessages";

interface BoardMenuProps {
  onRename: () => void;
}

export function BoardMenu({ onRename }: BoardMenuProps) {
  const boardStore = useBoardStoreApi();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);
  const config = useBoardStore((s) => s.config);
  const messages = useMessages();

  const fileEntries = [
    config.openFile && {
      id: "open",
      label: messages.shortcuts.openFile,
      icon: LuFolderOpen,
      shortcut: formatShortcut(SHORTCUTS.openFile.keys),
      onSelect: () => void importBoard(boardStore),
    },
    config.saveFile && {
      id: "save",
      label: messages.shortcuts.saveFile,
      icon: LuDownload,
      shortcut: formatShortcut(SHORTCUTS.saveFile.keys),
      onSelect: () => exportBoard(boardStore),
    },
    config.exportImage && {
      id: "export",
      label: messages.shortcuts.exportImage,
      icon: LuImageDown,
      shortcut: formatShortcut(SHORTCUTS.exportImage.keys),
      onSelect: () => boardStore.getState().setExportOpen(true),
    },
  ].filter((entry) => entry !== false);
  const renameEntries: MenuEntry[] = config.rename ? [{ id: "rename", label: messages.board.rename, icon: LuPencil, onSelect: onRename }] : [];
  const entries: MenuEntry[] =
    fileEntries.length > 0 && renameEntries.length > 0 ? [...fileEntries, "separator", ...renameEntries] : [...fileEntries, ...renameEntries];

  return (
    <div ref={anchorRef}>
      <IconButton
        icon={LuMenu}
        label={messages.board.menu}
        size="sm"
        tooltipSide="bottom"
        hasPopup
        popupRole="menu"
        active={anchor !== null}
        onClick={() => setAnchor((open) => (open ? null : anchorRef.current))}
      />
      {anchor && <Menu label={messages.board.menu} anchor={anchor} entries={entries} onClose={close} />}
    </div>
  );
}
