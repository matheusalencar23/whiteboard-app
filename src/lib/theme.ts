export interface Theme {
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

export const notebookTheme: Theme = {
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

export const theme: Theme = notebookTheme;

function toKebab(name: string) {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function applyTheme(target: Theme, root: HTMLElement = document.documentElement) {
  for (const [group, tokens] of Object.entries(target)) {
    for (const [name, value] of Object.entries(tokens as Record<string, string>)) {
      root.style.setProperty(`--${group}-${toKebab(name)}`, value);
    }
  }
}
