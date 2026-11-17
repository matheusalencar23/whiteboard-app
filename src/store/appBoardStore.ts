import { createBoardStore } from "./boardStore";
import {
  debounce,
  loadPreferences,
  loadStoredBoard,
  savePreferences,
  saveStoredBoard,
  type BoardContent,
} from "../lib/persistence";

const SAVE_DELAY = 300;

export const appBoardStore = createBoardStore({ preferences: loadPreferences() });

let openBoardId: string | null = null;
let saveFailed = false;

function persistBoard(id: string, content: BoardContent) {
  const ok = saveStoredBoard(id, content);
  if (!ok && !saveFailed) {
    appBoardStore
      .getState()
      .showNotice("Não foi possível salvar: o armazenamento do navegador está cheio.", "error");
  }
  saveFailed = !ok;
}

const scheduleSave = debounce(persistBoard, SAVE_DELAY);

function flushBoardSave() {
  scheduleSave.flush();
}

export function closeStoredBoard() {
  flushBoardSave();
  openBoardId = null;
}

export function openStoredBoard(id: string): boolean {
  closeStoredBoard();
  const board = loadStoredBoard(id);
  if (!board) return false;
  appBoardStore.getState().loadBoard(board);
  openBoardId = id;
  return true;
}

const unsubscribe = appBoardStore.subscribe((state, prev) => {
  if (
    state.showGrid !== prev.showGrid ||
    state.gridStyle !== prev.gridStyle ||
    state.libraryOpen !== prev.libraryOpen ||
    state.themeMode !== prev.themeMode ||
    state.collapsedLibraryGroups !== prev.collapsedLibraryGroups
  ) {
    savePreferences({
      showGrid: state.showGrid,
      gridStyle: state.gridStyle,
      libraryOpen: state.libraryOpen,
      themeMode: state.themeMode,
      collapsedLibraryGroups: state.collapsedLibraryGroups,
    });
  }
  if (openBoardId === null) return;
  const changed =
    state.name !== prev.name || state.elements !== prev.elements || state.viewport !== prev.viewport;
  if (!changed) return;
  const { name, elements, viewport } = state;
  scheduleSave(openBoardId, { name, elements, viewport });
});

window.addEventListener("pagehide", flushBoardSave);

import.meta.hot?.dispose(() => {
  scheduleSave.flush();
  unsubscribe();
  window.removeEventListener("pagehide", flushBoardSave);
});
