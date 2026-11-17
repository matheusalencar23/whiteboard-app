import { closeStoredBoard } from "../../store/appBoardStore";
import { listBoards, loadStoredBoard, type BoardContent, type BoardSummary } from "../../lib/persistence";

export interface BoardEntry {
  summary: BoardSummary;
  content: BoardContent | null;
}

export function homeLoader(): BoardEntry[] {
  closeStoredBoard();
  return listBoards().map((summary) => ({ summary, content: loadStoredBoard(summary.id) }));
}
