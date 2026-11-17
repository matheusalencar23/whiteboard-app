import { debounce, saveStoredBoard, type BoardContent } from "../lib/persistence";

const SAVE_DELAY = 300;

const failureListeners = new Set<() => void>();
let saveFailed = false;

function persistBoard(id: string, content: BoardContent) {
  const ok = saveStoredBoard(id, content);
  if (!ok && !saveFailed) failureListeners.forEach((listener) => listener());
  saveFailed = !ok;
}

const scheduleSave = debounce(persistBoard, SAVE_DELAY);

export function scheduleBoardSave(id: string, content: BoardContent) {
  scheduleSave(id, content);
}

export function flushBoardSave() {
  scheduleSave.flush();
}

export function onBoardSaveFailure(listener: () => void): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

window.addEventListener("pagehide", flushBoardSave);

import.meta.hot?.dispose(() => {
  scheduleSave.flush();
  window.removeEventListener("pagehide", flushBoardSave);
});
