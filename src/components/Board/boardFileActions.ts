import type { BoardStore } from "../../store/boardStore";
import { downloadBoardFile, pickBoardFile, readBoardFile } from "../../lib/boardFile";

export function exportBoard(boardStore: BoardStore) {
  const { name, elements, viewport } = boardStore.getState();
  downloadBoardFile({ name, elements, viewport });
}

export async function importBoard(boardStore: BoardStore, file?: File) {
  const chosen = file ?? (await pickBoardFile());
  if (!chosen) return;
  const result = await readBoardFile(chosen);
  const store = boardStore.getState();
  if (!result.ok) {
    store.showNotice(`"${result.name}" não é um board válido.`, "error");
    return;
  }
  store.openBoard(result.board);
  store.showNotice(`Board "${result.board.name}" aberto. Ctrl+Z volta ao anterior.`);
}
