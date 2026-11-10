import { flushBoardSave } from "../../store/boardStore";
import { listBoards, loadStoredBoard, type BoardContent, type BoardSummary } from "../../lib/persistence";

export interface BoardEntry {
  summary: BoardSummary;
  content: BoardContent | null;
}

export function homeLoader(): BoardEntry[] {
  flushBoardSave();
  return listBoards().map((summary) => ({ summary, content: loadStoredBoard(summary.id) }));
}
