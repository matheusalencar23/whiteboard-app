export type ColorScheme = "light" | "dark";

export type ThemeMode = ColorScheme | "system";

export const THEME_MODES: ThemeMode[] = ["light", "dark", "system"];

export interface Theme {
  scheme: ColorScheme;
  color: {
    background: string;
    surface: string;
    surfaceHover: string;
    surfaceSunken: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    textDisabled: string;
    accent: string;
    accentSoft: string;
    accentContrast: string;
    danger: string;
    dangerSoft: string;
    backdrop: string;
  };
  canvas: {
    selection: string;
    selectionFill: string;
    handleFill: string;
    gridDotMinor: string;
    gridDotMajor: string;
    gridLineMinor: string;
    gridLineMajor: string;
    measurementFill: string;
    measurementText: string;
    exportBackground: string;
  };
  font: {
    ui: string;
    mono: string;
    hand: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadow: {
    panel: string;
    tooltip: string;
    modal: string;
  };
  palette: {
    ink: string;
    paper: string;
    grayLight: string;
    red: string;
    green: string;
    blue: string;
    amber: string;
    redLight: string;
    greenLight: string;
    blueLight: string;
    amberLight: string;
  };
}

const accent = "#5a82d6";

export const lightTheme: Theme = {
  scheme: "light",
  color: {
    background: "#f8f9fb",
    surface: "#ffffff",
    surfaceHover: "#f1f3f6",
    surfaceSunken: "#eef0f4",
    border: "#e3e6eb",
    borderStrong: "#cdd2da",
    text: "#2a2d33",
    textMuted: "#7a808a",
    textDisabled: "#c3c8cf",
    accent,
    accentSoft: "#e8eefa",
    accentContrast: "#ffffff",
    danger: "#c9463d",
    dangerSoft: "#fbeceb",
    backdrop: "rgba(30, 35, 45, 0.28)",
  },
  canvas: {
    selection: accent,
    selectionFill: "rgba(90, 130, 214, 0.07)",
    handleFill: "#ffffff",
    gridDotMinor: "rgba(60, 70, 90, 0.18)",
    gridDotMajor: "rgba(60, 70, 90, 0.36)",
    gridLineMinor: "rgba(60, 70, 90, 0.06)",
    gridLineMajor: "rgba(60, 70, 90, 0.12)",
    measurementFill: accent,
    measurementText: "#ffffff",
    exportBackground: "#ffffff",
  },
  font: {
    ui: '"IBM Plex Sans", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
    hand: '"Caveat", cursive',
  },
  radius: {
    sm: "4px",
    md: "6px",
    lg: "10px",
  },
  shadow: {
    panel: "0 1px 0 rgba(30, 35, 45, 0.04), 0 8px 20px -12px rgba(30, 35, 45, 0.25)",
    tooltip: "0 4px 12px -4px rgba(30, 35, 45, 0.35)",
    modal: "0 2px 0 rgba(30, 35, 45, 0.04), 0 24px 48px -16px rgba(30, 35, 45, 0.35)",
  },
  palette: {
    ink: "#1f2328",
    paper: "#ffffff",
    grayLight: "#e6e8ec",
    red: "#c9463d",
    green: "#3a8a5c",
    blue: "#3f6fc4",
    amber: "#c98a1b",
    redLight: "#f4cfcb",
    greenLight: "#cfe8d8",
    blueLight: "#d3e0f5",
    amberLight: "#f5e2bb",
  },
};

const darkAccent = "#7c9ee6";

export const darkTheme: Theme = {
  scheme: "dark",
  color: {
    background: "#17191d",
    surface: "#212429",
    surfaceHover: "#2a2e34",
    surfaceSunken: "#1b1d21",
    border: "#30343b",
    borderStrong: "#454a53",
    text: "#e3e5e9",
    textMuted: "#959ba5",
    textDisabled: "#555b64",
    accent: darkAccent,
    accentSoft: "#26304a",
    accentContrast: "#10131a",
    danger: "#e0716a",
    dangerSoft: "#3b2524",
    backdrop: "rgba(0, 0, 0, 0.55)",
  },
  canvas: {
    selection: darkAccent,
    selectionFill: "rgba(124, 158, 230, 0.1)",
    handleFill: "#212429",
    gridDotMinor: "rgba(200, 210, 230, 0.14)",
    gridDotMajor: "rgba(200, 210, 230, 0.3)",
    gridLineMinor: "rgba(200, 210, 230, 0.05)",
    gridLineMajor: "rgba(200, 210, 230, 0.1)",
    measurementFill: darkAccent,
    measurementText: "#10131a",
    exportBackground: "#17191d",
  },
  font: lightTheme.font,
  radius: lightTheme.radius,
  shadow: {
    panel: "0 1px 0 rgba(0, 0, 0, 0.2), 0 8px 20px -12px rgba(0, 0, 0, 0.6)",
    tooltip: "0 4px 12px -4px rgba(0, 0, 0, 0.6)",
    modal: "0 2px 0 rgba(0, 0, 0, 0.2), 0 24px 48px -16px rgba(0, 0, 0, 0.7)",
  },
  palette: lightTheme.palette,
};

const THEMES: Record<ColorScheme, Theme> = { light: lightTheme, dark: darkTheme };

export function getTheme(scheme: ColorScheme): Theme {
  return THEMES[scheme];
}

function toKebab(name: string) {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function themeVariables(target: Theme): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [group, tokens] of Object.entries(target)) {
    if (typeof tokens !== "object") continue;
    for (const [name, value] of Object.entries(tokens as Record<string, string>)) {
      variables[`--wb-${group}-${toKebab(name)}`] = value;
    }
  }
  return variables;
}

export function applyTheme(target: Theme, root: HTMLElement = document.documentElement) {
  root.style.colorScheme = target.scheme;
  for (const [name, value] of Object.entries(themeVariables(target))) root.style.setProperty(name, value);
}
