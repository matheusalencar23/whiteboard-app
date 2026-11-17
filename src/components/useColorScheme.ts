import { useSyncExternalStore } from "react";
import { useBoardStore } from "../store/boardStore";
import { getTheme, type ColorScheme, type Theme, type ThemeMode } from "../lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function darkQuery(): MediaQueryList | null {
  return typeof window.matchMedia === "function" ? window.matchMedia(DARK_QUERY) : null;
}

function getSystemScheme(): ColorScheme {
  return darkQuery()?.matches ? "dark" : "light";
}

function subscribeSystemScheme(onChange: () => void) {
  const query = darkQuery();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

export function resolveColorScheme(mode: ThemeMode): ColorScheme {
  return mode === "system" ? getSystemScheme() : mode;
}

export function useColorScheme(): ColorScheme {
  const mode = useBoardStore((s) => s.themeMode);
  const system = useSyncExternalStore(subscribeSystemScheme, getSystemScheme);
  return mode === "system" ? system : mode;
}

export function useTheme(): Theme {
  return getTheme(useColorScheme());
}

export function toggleColorScheme() {
  const { themeMode, setThemeMode } = useBoardStore.getState();
  setThemeMode(resolveColorScheme(themeMode) === "dark" ? "light" : "dark");
}
