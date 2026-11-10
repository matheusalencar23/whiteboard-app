import { DEFAULT_BOARD_NAME, parseBoardFile, serializeBoardFile, type BoardContent } from "./persistence";

export const BOARD_FILE_EXTENSION = ".whiteboard.json";
const BOARD_FILE_ACCEPT = `${BOARD_FILE_EXTENSION},.json,application/json`;

export type OpenResult =
  | { ok: true; board: BoardContent; name: string }
  | { ok: false; name: string };

const FORBIDDEN_FILE_CHARS = new Set('<>:"/\\|?*');

function isAllowedFileChar(char: string): boolean {
  return char.charCodeAt(0) >= 32 && !FORBIDDEN_FILE_CHARS.has(char);
}

export function safeFileName(name: string, extension: string): string {
  const safe = Array.from(name).filter(isAllowedFileChar).join("").replace(/^[\s.]+|[\s.]+$/g, "");
  return `${safe || DEFAULT_BOARD_NAME}${extension}`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function nameFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(BOARD_FILE_EXTENSION)) return fileName.slice(0, -BOARD_FILE_EXTENSION.length);
  if (lower.endsWith(".json")) return fileName.slice(0, -".json".length);
  return fileName;
}

export function downloadBoardFile(board: BoardContent): void {
  const blob = new Blob([serializeBoardFile(board)], { type: "application/json" });
  downloadBlob(blob, safeFileName(board.name, BOARD_FILE_EXTENSION));
}

export function pickBoardFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = BOARD_FILE_ACCEPT;
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener("cancel", () => resolve(null), { once: true });
    input.click();
  });
}

export async function readBoardFile(file: File): Promise<OpenResult> {
  const board = parseBoardFile(await file.text().catch(() => ""), nameFromFileName(file.name));
  return board ? { ok: true, board, name: file.name } : { ok: false, name: file.name };
}

export function isBoardFileCandidate(file: File): boolean {
  return file.type === "application/json" || file.name.toLowerCase().endsWith(".json");
}
