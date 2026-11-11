import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { LuLayoutGrid } from "react-icons/lu";
import { Canvas } from "./Canvas/Canvas";
import { Toolbar } from "./Toolbar/Toolbar";
import { useShortcuts } from "./useShortcuts";
import { ZoomIndicator } from "./ZoomIndicator/ZoomIndicator";
import { HelpButton } from "./Help/HelpButton";
import { BoardNotice } from "./BoardNotice";
import { BoardTitle } from "./BoardTitle/BoardTitle";
import { BoardMenu } from "./BoardMenu/BoardMenu";
import { ExportDialog } from "./Export/ExportDialog";
import { importBoard } from "./boardFileActions";
import { isBoardFileCandidate } from "../../lib/boardFile";
import { IconButton } from "../../ui/IconButton/IconButton";
import { flushBoardSave, useBoardStore } from "../../store/boardStore";
import styles from "./Board.module.scss";

function hasFiles(e: React.DragEvent) {
  return e.dataTransfer.types.includes("Files");
}

export function Board() {
  useShortcuts();
  const navigate = useNavigate();
  const name = useBoardStore((s) => s.name);
  const exportOpen = useBoardStore((s) => s.exportOpen);
  const setExportOpen = useBoardStore((s) => s.setExportOpen);
  const [dropping, setDropping] = useState(false);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => flushBoardSave, []);

  useEffect(() => {
    document.title = `${name} · Whiteboard`;
  }, [name]);

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
    if (file) void importBoard(file);
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
          <IconButton
            icon={LuLayoutGrid}
            label="Todos os boards"
            size="sm"
            tooltipSide="bottom"
            onClick={() => navigate("/")}
          />
          <BoardMenu onRename={() => setRenaming(true)} />
        </div>
        <BoardTitle editing={renaming} onEditingChange={setRenaming} />
      </div>
      <div className={styles.dock}>
        <Toolbar />
      </div>
      <Canvas />
      <div className={styles.corner}>
        <ZoomIndicator />
        <HelpButton />
      </div>
      <div className={styles.notice}>
        <BoardNotice />
      </div>
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </div>
  );
}
