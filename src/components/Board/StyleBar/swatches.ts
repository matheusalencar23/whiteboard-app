import { TRANSPARENT } from "../../../lib/elements/types";
import { lightTheme } from "../../../lib/theme";
import type { Swatch } from "./ColorField";

const { palette } = lightTheme;

export const STROKE_SWATCHES: Swatch[] = [
  { color: palette.ink, label: "Preto" },
  { color: palette.red, label: "Vermelho" },
  { color: palette.green, label: "Verde" },
  { color: palette.blue, label: "Azul" },
  { color: palette.amber, label: "Âmbar" },
];

export const FILL_SWATCHES: Swatch[] = [
  { color: TRANSPARENT, label: "Sem preenchimento" },
  { color: palette.paper, label: "Branco" },
  { color: palette.grayLight, label: "Cinza claro" },
  { color: palette.redLight, label: "Vermelho claro" },
  { color: palette.greenLight, label: "Verde claro" },
  { color: palette.blueLight, label: "Azul claro" },
  { color: palette.amberLight, label: "Âmbar claro" },
];
