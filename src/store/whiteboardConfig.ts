export const TOOL_TYPES = ["hand", "selection", "rectangle", "diamond", "ellipse", "arrow", "freedraw", "text"] as const;

export type Tool = (typeof TOOL_TYPES)[number];

export interface WhiteboardConfig {
  readOnly: boolean;
  tools: readonly Tool[];
  library: boolean;
  styleBar: boolean;
  openFile: boolean;
  saveFile: boolean;
  exportImage: boolean;
  rename: boolean;
  grid: boolean;
  zoomControls: boolean;
  themeToggle: boolean;
  help: boolean;
  fileDrop: boolean;
}

export const DEFAULT_CONFIG: WhiteboardConfig = {
  readOnly: false,
  tools: TOOL_TYPES,
  library: true,
  styleBar: true,
  openFile: true,
  saveFile: true,
  exportImage: true,
  rename: true,
  grid: true,
  zoomControls: true,
  themeToggle: true,
  help: true,
  fileDrop: true,
};

const EDITING_FEATURES_OFF: Partial<WhiteboardConfig> = {
  tools: [],
  library: false,
  styleBar: false,
  openFile: false,
  rename: false,
  fileDrop: false,
};

export function resolveConfig(given: Partial<WhiteboardConfig> = {}): WhiteboardConfig {
  const defined = Object.fromEntries(Object.entries(given).filter(([, value]) => value !== undefined));
  const config: WhiteboardConfig = { ...DEFAULT_CONFIG, ...defined };
  const tools = TOOL_TYPES.filter((tool) => config.tools.includes(tool));
  return config.readOnly ? { ...config, ...EDITING_FEATURES_OFF } : { ...config, tools };
}

export function sameConfig(a: WhiteboardConfig, b: WhiteboardConfig): boolean {
  return (Object.keys(a) as (keyof WhiteboardConfig)[]).every((key) =>
    key === "tools" ? a.tools.length === b.tools.length && a.tools.every((tool, i) => tool === b.tools[i]) : a[key] === b[key],
  );
}

export function canEdit(config: WhiteboardConfig): boolean {
  return !config.readOnly;
}

export function isToolAllowed(config: WhiteboardConfig, tool: Tool): boolean {
  return config.readOnly ? tool === "hand" : config.tools.includes(tool);
}

export function fallbackTool(config: WhiteboardConfig): Tool {
  if (config.readOnly) return "hand";
  return config.tools.includes("selection") ? "selection" : (config.tools[0] ?? "hand");
}

export function hasBoardMenu(config: WhiteboardConfig): boolean {
  return config.openFile || config.saveFile || config.exportImage || config.rename;
}
