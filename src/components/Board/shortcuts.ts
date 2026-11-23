export interface Shortcut {
  keys: string[];
}

export const SHORTCUTS = {
  undo: { keys: ["Ctrl", "Z"] },
  redo: { keys: ["Ctrl", "Shift", "Z"] },
  selectAll: { keys: ["Ctrl", "A"] },
  delete: { keys: ["Delete"] },
  duplicate: { keys: ["Ctrl", "D"] },
  copy: { keys: ["Ctrl", "C"] },
  cut: { keys: ["Ctrl", "X"] },
  paste: { keys: ["Ctrl", "V"] },
  group: { keys: ["Ctrl", "G"] },
  ungroup: { keys: ["Ctrl", "Shift", "G"] },
  bringToFront: { keys: ["Ctrl", "Shift", "]"] },
  bringForward: { keys: ["Ctrl", "]"] },
  sendBackward: { keys: ["Ctrl", "["] },
  sendToBack: { keys: ["Ctrl", "Shift", "["] },
  nudge: { keys: ["Setas"] },
  nudgeFar: { keys: ["Shift", "Setas"] },
  deselect: { keys: ["Esc"] },
  library: { keys: ["Shift", "L"] },
  toggleGrid: { keys: ["G"] },
  cycleGrid: { keys: ["Shift", "G"] },
  toggleTheme: { keys: ["Alt", "Shift", "D"] },
  zoomIn: { keys: ["Ctrl", "+"] },
  zoomOut: { keys: ["Ctrl", "−"] },
  zoomReset: { keys: ["Ctrl", "0"] },
  bold: { keys: ["Ctrl", "B"] },
  italic: { keys: ["Ctrl", "I"] },
  underline: { keys: ["Ctrl", "U"] },
  textBigger: { keys: ["Ctrl", "Shift", ">"] },
  textSmaller: { keys: ["Ctrl", "Shift", "<"] },
  editText: { keys: ["Enter"] },
  confirmText: { keys: ["Ctrl", "Enter"] },
  saveFile: { keys: ["Ctrl", "S"] },
  openFile: { keys: ["Ctrl", "O"] },
  exportImage: { keys: ["Ctrl", "Shift", "E"] },
  help: { keys: ["?"] },
} satisfies Record<string, Shortcut>;

export type ShortcutId = keyof typeof SHORTCUTS;

const SYMBOL_KEYS = ["+", "−"];

export function formatShortcut(keys: string[]): string {
  return keys.join(keys.some((key) => SYMBOL_KEYS.includes(key)) ? " " : "+");
}
