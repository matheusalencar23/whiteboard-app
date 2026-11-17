import { useEffect, useRef, useState } from "react";
import { LuLayoutGrid } from "react-icons/lu";
import { Canvas } from "./Canvas/Canvas";
import { Toolbar } from "./Toolbar/Toolbar";
import { useShortcuts } from "./useShortcuts";
import { ZoomIndicator } from "./ZoomIndicator/ZoomIndicator";
import { HelpButton } from "./Help/HelpButton";
import { ThemeMenu } from "./ThemeMenu/ThemeMenu";
import { BoardNotice } from "./BoardNotice";
import { BoardTitle } from "./BoardTitle/BoardTitle";
import { BoardMenu } from "./BoardMenu/BoardMenu";
import { ExportDialog } from "./Export/ExportDialog";
import { LibraryPanel } from "./Library/LibraryPanel";
import { importBoard } from "./boardFileActions";
import { isBoardFileCandidate } from "../../lib/boardFile";
import type { Preferences } from "../../lib/persistence";
import { IconButton } from "../../ui/IconButton/IconButton";
import {
  createBoardStore,
  getPreferences,
  preferencesChanged,
  type ChangeInfo,
  type WhiteboardScene,
} from "../../store/boardStore";
import { BoardStoreContext, useBoardStore, useBoardStoreApi } from "../../store/boardStoreContext";
import styles from "./Whiteboard.module.scss";

export interface WhiteboardBackAction {
  label: string;
  onClick: () => void;
}

export interface WhiteboardProps {
  initialData?: Partial<WhiteboardScene>;
  initialPreferences?: Partial<Preferences>;
  onChange?: (scene: WhiteboardScene, info: ChangeInfo) => void;
  onPreferencesChange?: (preferences: Preferences) => void;
  back?: WhiteboardBackAction;
}

export function Whiteboard({ initialData, initialPreferences, onChange, onPreferencesChange, back }: WhiteboardProps) {
  const [store] = useState(() => createBoardStore({ scene: initialData, preferences: initialPreferences }));
  const onChangeRef = useRef(onChange);
  const onPreferencesChangeRef = useRef(onPreferencesChange);

  useEffect(() => {
    onChangeRef.current = onChange;
    onPreferencesChangeRef.current = onPreferencesChange;
  });

  useEffect(
    () =>
      store.subscribe((state, prev) => {
        if (state.lastChange !== prev.lastChange) {
          const { name, elements, viewport, lastChange } = state;
          onChangeRef.current?.({ name, elements, viewport }, { reason: lastChange.reason, changedIds: lastChange.changedIds });
        }
        if (preferencesChanged(state, prev)) onPreferencesChangeRef.current?.(getPreferences(state));
      }),
    [store],
  );

  return (
    <BoardStoreContext value={store}>
      <WhiteboardView back={back} />
    </BoardStoreContext>
  );
}

function hasFiles(e: React.DragEvent) {
  return e.dataTransfer.types.includes("Files");
}

function WhiteboardView({ back }: { back?: WhiteboardBackAction }) {
  useShortcuts();
  const boardStore = useBoardStoreApi();
  const exportOpen = useBoardStore((s) => s.exportOpen);
  const setExportOpen = useBoardStore((s) => s.setExportOpen);
  const libraryOpen = useBoardStore((s) => s.libraryOpen);
  const [dropping, setDropping] = useState(false);
  const [renaming, setRenaming] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropping(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDropping(false);
  }

  function handleDrop(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDropping(false);
    const file = Array.from(e.dataTransfer.files).find(isBoardFileCandidate) ?? e.dataTransfer.files[0];
    if (file) void importBoard(boardStore, file);
  }

  return (
    <div
      className={styles.board}
      data-dropping={dropping}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.title}>
        <div className={styles.actions}>
          {back && (
            <IconButton icon={LuLayoutGrid} label={back.label} size="sm" tooltipSide="bottom" onClick={back.onClick} />
          )}
          <BoardMenu onRename={() => setRenaming(true)} />
        </div>
        <BoardTitle editing={renaming} onEditingChange={setRenaming} />
      </div>
      <div className={styles.dock}>
        <Toolbar />
      </div>
      <Canvas />
      {libraryOpen && (
        <div className={styles.sidebar}>
          <LibraryPanel />
        </div>
      )}
      <div className={styles.corner}>
        <ZoomIndicator />
        <ThemeMenu />
        <HelpButton />
      </div>
      <div className={styles.notice}>
        <BoardNotice />
      </div>
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </div>
  );
}
