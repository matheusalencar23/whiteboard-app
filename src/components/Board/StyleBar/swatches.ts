import { useMemo } from "react";
import { TRANSPARENT } from "../../../lib/elements/types";
import { useBoardStore } from "../../../store/boardStoreContext";
import { AUTO_COLOR, type Swatch } from "./ColorField";

const NO_FILL: Swatch = { color: TRANSPARENT, label: "Sem preenchimento" };
const AUTO_TEXT_COLOR: Swatch = { color: AUTO_COLOR, label: "Automática (cor do contorno)" };
const NO_CELL_COLOR: Swatch = { color: AUTO_COLOR, label: "Sem cor própria" };

export function useStrokeSwatches(): Swatch[] {
  const colors = useBoardStore((s) => s.config.strokeColors);
  return useMemo(() => [...colors], [colors]);
}

export function useFillSwatches(): Swatch[] {
  const colors = useBoardStore((s) => s.config.fillColors);
  return useMemo(() => [NO_FILL, ...colors], [colors]);
}

export function useTextSwatches(): Swatch[] {
  const colors = useBoardStore((s) => s.config.strokeColors);
  return useMemo(() => [AUTO_TEXT_COLOR, ...colors], [colors]);
}

export function useCellSwatches(): Swatch[] {
  const fill = useFillSwatches();
  return useMemo(() => [NO_CELL_COLOR, ...fill], [fill]);
}
