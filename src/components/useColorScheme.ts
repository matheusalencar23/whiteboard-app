import { useSyncExternalStore } from "react";
import type { BoardStore } from "../store/boardStore";
import { useBoardStore } from "../store/boardStoreContext";
import type { ColorScheme, Theme, ThemeMode } from "../lib/theme";

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

export function useResolvedColorScheme(mode: ThemeMode): ColorScheme {
  const system = useSyncExternalStore(subscribeSystemScheme, getSystemScheme);
  return mode === "system" ? system : mode;
}

export function useColorScheme(): ColorScheme {
  return useResolvedColorScheme(useBoardStore((s) => s.themeMode));
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return useBoardStore((s) => s.config.themes[scheme]);
}

export function toggleColorScheme(boardStore: BoardStore) {
  const { themeMode, setThemeMode } = boardStore.getState();
  setThemeMode(resolveColorScheme(themeMode) === "dark" ? "light" : "dark");
}
