import { useMemo } from "react";
import { TRANSPARENT } from "../../../lib/elements/types";
import { lightTheme } from "../../../lib/theme";
import type { Messages, PaletteColor } from "../../../i18n/messages";
import { useMessages } from "../../../i18n/useMessages";
import type { ColorSwatch } from "../../../store/whiteboardConfig";
import { useBoardStore } from "../../../store/boardStoreContext";
import { AUTO_COLOR, type Swatch } from "./ColorField";

const DEFAULT_STROKE_COLORS: PaletteColor[] = ["ink", "red", "green", "blue", "amber"];
const DEFAULT_FILL_COLORS: PaletteColor[] = ["paper", "grayLight", "redLight", "greenLight", "blueLight", "amberLight"];

function paletteSwatches(names: PaletteColor[], messages: Messages): Swatch[] {
  return names.map((name) => ({ color: lightTheme.palette[name], label: messages.colors[name] }));
}

function useColors(pick: (colors: { stroke: readonly ColorSwatch[] | null; fill: readonly ColorSwatch[] | null }) => readonly ColorSwatch[] | null, defaults: PaletteColor[]): Swatch[] {
  const configured = useBoardStore((s) => pick({ stroke: s.config.strokeColors, fill: s.config.fillColors }));
  const messages = useMessages();
  return useMemo(() => (configured ? [...configured] : paletteSwatches(defaults, messages)), [configured, defaults, messages]);
}

export function useStrokeSwatches(): Swatch[] {
  return useColors((colors) => colors.stroke, DEFAULT_STROKE_COLORS);
}

export function useFillSwatches(): Swatch[] {
  const colors = useColors((all) => all.fill, DEFAULT_FILL_COLORS);
  const messages = useMessages();
  return useMemo(() => [{ color: TRANSPARENT, label: messages.colors.none }, ...colors], [colors, messages]);
}

export function useTextSwatches(): Swatch[] {
  const colors = useStrokeSwatches();
  const messages = useMessages();
  return useMemo(() => [{ color: AUTO_COLOR, label: messages.colors.autoText }, ...colors], [colors, messages]);
}

export function useCellSwatches(): Swatch[] {
  const fill = useFillSwatches();
  const messages = useMessages();
  return useMemo(() => [{ color: AUTO_COLOR, label: messages.colors.noCellColor }, ...fill], [fill, messages]);
}
