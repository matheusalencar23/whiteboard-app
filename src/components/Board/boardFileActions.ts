import { useBoardStore } from "../../store/boardStore";
import { downloadBoardFile, pickBoardFile, readBoardFile } from "../../lib/boardFile";

export function exportBoard() {
  const { name, elements, viewport } = useBoardStore.getState();
  downloadBoardFile({ name, elements, viewport });
}

export async function importBoard(file?: File) {
  const chosen = file ?? (await pickBoardFile());
  if (!chosen) return;
  const result = await readBoardFile(chosen);
  const store = useBoardStore.getState();
  if (!result.ok) {
    store.showNotice(`"${result.name}" não é um board válido.`, "error");
    return;
  }
  store.openBoard(result.board);
  store.showNotice(`Board "${result.board.name}" aberto. Ctrl+Z volta ao anterior.`);
}
