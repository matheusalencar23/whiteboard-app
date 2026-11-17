import { useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type Ref } from "react";
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
import { canvasToBlob, renderToCanvas, type ExportOptions } from "../../lib/export/exportScene";
import { IconButton } from "../../ui/IconButton/IconButton";
import {
  createBoardStore,
  getPreferences,
  preferencesChanged,
  type BoardStore,
  type ChangeInfo,
  type UpdateSceneOptions,
  type WhiteboardScene,
} from "../../store/boardStore";
import { BoardStoreContext, useBoardStore, useBoardStoreApi } from "../../store/boardStoreContext";
import { BoardRootContext, focusBoard } from "./boardRoot";
import { themeVariables } from "../../lib/theme";
import { PortalContainerContext } from "../../ui/portal";
import { useTheme } from "../useColorScheme";
import styles from "./Whiteboard.module.scss";

export interface WhiteboardBackAction {
  label: string;
  onClick: () => void;
}

export interface WhiteboardApi {
  getScene(): WhiteboardScene;
  updateScene(patch: Partial<WhiteboardScene>, options?: UpdateSceneOptions): void;
  undo(): void;
  redo(): void;
  resetHistory(): void;
  exportPng(options?: Partial<ExportOptions>): Promise<Blob | null>;
}

const DEFAULT_PNG_OPTIONS: ExportOptions = { background: true, scheme: "light", scale: 1 };

function createWhiteboardApi(store: BoardStore): WhiteboardApi {
  return {
    getScene() {
      const { name, elements, viewport } = store.getState();
      return { name, elements, viewport };
    },
    updateScene: (patch, options) => store.getState().updateScene(patch, options),
    undo: () => store.getState().undo(),
    redo: () => store.getState().redo(),
    resetHistory: () => store.getState().resetHistory(),
    async exportPng(options) {
      const canvas = renderToCanvas(store.getState().elements, { ...DEFAULT_PNG_OPTIONS, ...options });
      return canvas ? canvasToBlob(canvas) : null;
    },
  };
}

export interface WhiteboardProps {
  ref?: Ref<WhiteboardApi>;
  initialData?: Partial<WhiteboardScene>;
  initialPreferences?: Partial<Preferences>;
  onChange?: (scene: WhiteboardScene, info: ChangeInfo) => void;
  onPreferencesChange?: (preferences: Preferences) => void;
  back?: WhiteboardBackAction;
  autoFocus?: boolean;
}

export function Whiteboard({
  ref,
  initialData,
  initialPreferences,
  onChange,
  onPreferencesChange,
  back,
  autoFocus = false,
}: WhiteboardProps) {
  const [store] = useState(() => createBoardStore({ scene: initialData, preferences: initialPreferences }));
  useImperativeHandle(ref, () => createWhiteboardApi(store), [store]);
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
      <WhiteboardView back={back} autoFocus={autoFocus} />
    </BoardStoreContext>
  );
}

function hasFiles(e: React.DragEvent) {
  return e.dataTransfer.types.includes("Files");
}

function WhiteboardView({ back, autoFocus }: { back?: WhiteboardBackAction; autoFocus: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const theme = useTheme();
  const themeStyle = useMemo(() => ({ ...themeVariables(theme), colorScheme: theme.scheme }) as CSSProperties, [theme]);
  useShortcuts(rootRef);
  const boardStore = useBoardStoreApi();
  const exportOpen = useBoardStore((s) => s.exportOpen);
  const setExportOpen = useBoardStore((s) => s.setExportOpen);
  const libraryOpen = useBoardStore((s) => s.libraryOpen);
  const [dropping, setDropping] = useState(false);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (autoFocus) focusBoard(rootRef);
  }, [autoFocus]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    function handleFocusOut(e: FocusEvent) {
      if (e.relatedTarget) return;
      const lost = e.target as Node;
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!lost.isConnected && (active === null || active === document.body)) focusBoard(rootRef);
      });
    }
    root.addEventListener("focusout", handleFocusOut);
    return () => root.removeEventListener("focusout", handleFocusOut);
  }, []);

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
    <BoardRootContext value={rootRef}>
      <PortalContainerContext value={portalContainer}>
        <div
          ref={rootRef}
          tabIndex={-1}
          className={styles.board}
          style={themeStyle}
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
          <div ref={setPortalContainer} data-portal-container="" />
        </div>
      </PortalContainerContext>
    </BoardRootContext>
  );
}
