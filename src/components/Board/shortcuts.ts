export interface Shortcut {
  label: string;
  keys: string[];
}

export const SHORTCUTS = {
  undo: { label: "Desfazer", keys: ["Ctrl", "Z"] },
  redo: { label: "Refazer", keys: ["Ctrl", "Shift", "Z"] },
  selectAll: { label: "Selecionar tudo", keys: ["Ctrl", "A"] },
  delete: { label: "Apagar seleção", keys: ["Delete"] },
  deselect: { label: "Limpar seleção", keys: ["Esc"] },
  toggleGrid: { label: "Mostrar ou esconder a grade", keys: ["G"] },
  cycleGrid: { label: "Alternar a grade entre pontos e linhas", keys: ["Shift", "G"] },
  zoomIn: { label: "Aumentar zoom", keys: ["Ctrl", "+"] },
  zoomOut: { label: "Diminuir zoom", keys: ["Ctrl", "−"] },
  zoomReset: { label: "Voltar a 100%", keys: ["Ctrl", "0"] },
  bold: { label: "Negrito", keys: ["Ctrl", "B"] },
  italic: { label: "Itálico", keys: ["Ctrl", "I"] },
  textBigger: { label: "Aumentar o texto", keys: ["Ctrl", "Shift", ">"] },
  textSmaller: { label: "Diminuir o texto", keys: ["Ctrl", "Shift", "<"] },
  confirmText: { label: "Terminar a edição do texto", keys: ["Ctrl", "Enter"] },
  saveFile: { label: "Salvar em arquivo", keys: ["Ctrl", "S"] },
  openFile: { label: "Abrir arquivo", keys: ["Ctrl", "O"] },
  help: { label: "Ajuda", keys: ["?"] },
} satisfies Record<string, Shortcut>;

const SYMBOL_KEYS = ["+", "−"];

export function formatShortcut(keys: string[]): string {
  return keys.join(keys.some((key) => SYMBOL_KEYS.includes(key)) ? " " : "+");
}
