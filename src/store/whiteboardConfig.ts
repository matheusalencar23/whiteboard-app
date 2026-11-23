import { darkTheme, lightTheme, type ColorScheme, type Theme } from "../lib/theme";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEPS } from "../lib/viewport";

export const TOOL_TYPES = ["hand", "selection", "rectangle", "diamond", "ellipse", "arrow", "freedraw", "text"] as const;

export type Tool = (typeof TOOL_TYPES)[number];

export interface ColorSwatch {
  color: string;
  label: string;
}

export type ColorOption = string | ColorSwatch;

export type ThemeOverride = { [Group in Exclude<keyof Theme, "scheme" | "palette">]?: Partial<Theme[Group]> };

interface WhiteboardFeatures {
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

export interface WhiteboardConfig extends WhiteboardFeatures {
  strokeColors: readonly ColorSwatch[];
  fillColors: readonly ColorSwatch[];
  zoomSteps: readonly number[];
  themes: Readonly<Record<ColorScheme, Theme>>;
}

export interface WhiteboardConfigInput extends Partial<WhiteboardFeatures> {
  strokeColors?: readonly ColorOption[];
  fillColors?: readonly ColorOption[];
  zoomSteps?: readonly number[];
  theme?: Partial<Record<ColorScheme, ThemeOverride>>;
}

const { palette } = lightTheme;

const DEFAULT_STROKE_COLORS: ColorSwatch[] = [
  { color: palette.ink, label: "Preto" },
  { color: palette.red, label: "Vermelho" },
  { color: palette.green, label: "Verde" },
  { color: palette.blue, label: "Azul" },
  { color: palette.amber, label: "Âmbar" },
];

const DEFAULT_FILL_COLORS: ColorSwatch[] = [
  { color: palette.paper, label: "Branco" },
  { color: palette.grayLight, label: "Cinza claro" },
  { color: palette.redLight, label: "Vermelho claro" },
  { color: palette.greenLight, label: "Verde claro" },
  { color: palette.blueLight, label: "Azul claro" },
  { color: palette.amberLight, label: "Âmbar claro" },
];

const BASE_THEMES: Record<ColorScheme, Theme> = { light: lightTheme, dark: darkTheme };

const DEFAULT_FEATURES: WhiteboardFeatures = {
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

const EDITING_FEATURES_OFF: Partial<WhiteboardFeatures> = {
  tools: [],
  library: false,
  styleBar: false,
  openFile: false,
  rename: false,
  fileDrop: false,
};

function definedEntries<T extends object>(given: T): Partial<T> {
  return Object.fromEntries(Object.entries(given).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function toSwatch(option: ColorOption): ColorSwatch {
  return typeof option === "string" ? { color: option, label: option.toUpperCase() } : option;
}

function resolveColors(given: readonly ColorOption[] | undefined, fallback: ColorSwatch[]): ColorSwatch[] {
  return given && given.length > 0 ? given.map(toSwatch) : fallback;
}

function resolveZoomSteps(given: readonly number[] | undefined): readonly number[] {
  const steps = [...new Set((given ?? []).filter((step) => Number.isFinite(step) && step >= MIN_ZOOM && step <= MAX_ZOOM))];
  return steps.length > 0 ? steps.sort((a, b) => a - b) : ZOOM_STEPS;
}

function resolveTheme(base: Theme, override: ThemeOverride | undefined): Theme {
  if (!override) return base;
  const theme = { ...base } as Record<string, unknown>;
  for (const [group, tokens] of Object.entries(override)) {
    if (tokens) theme[group] = { ...(base[group as keyof ThemeOverride] as object), ...definedEntries(tokens) };
  }
  return theme as unknown as Theme;
}

export function resolveConfig(given: WhiteboardConfigInput = {}): WhiteboardConfig {
  const { strokeColors, fillColors, zoomSteps, theme, ...features } = given;
  const resolved: WhiteboardFeatures = { ...DEFAULT_FEATURES, ...definedEntries(features) };
  const tools = TOOL_TYPES.filter((tool) => resolved.tools.includes(tool));
  return {
    ...(resolved.readOnly ? { ...resolved, ...EDITING_FEATURES_OFF } : { ...resolved, tools }),
    strokeColors: resolveColors(strokeColors, DEFAULT_STROKE_COLORS),
    fillColors: resolveColors(fillColors, DEFAULT_FILL_COLORS),
    zoomSteps: resolveZoomSteps(zoomSteps),
    themes: { light: resolveTheme(BASE_THEMES.light, theme?.light), dark: resolveTheme(BASE_THEMES.dark, theme?.dark) },
  };
}

export function sameConfig(a: WhiteboardConfig, b: WhiteboardConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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
