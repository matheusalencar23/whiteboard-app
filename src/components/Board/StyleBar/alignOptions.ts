import { LuAlignCenter, LuAlignLeft, LuAlignRight } from "react-icons/lu";
import type { TextAlign } from "../../../lib/elements/types";
import type { Option } from "./StyleControls";

export const ALIGN_OPTIONS: Option<TextAlign>[] = [
  { value: "left", label: "Alinhar à esquerda", icon: LuAlignLeft },
  { value: "center", label: "Centralizar", icon: LuAlignCenter },
  { value: "right", label: "Alinhar à direita", icon: LuAlignRight },
];
