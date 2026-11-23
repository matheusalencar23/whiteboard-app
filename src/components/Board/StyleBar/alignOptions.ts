import { LuAlignCenter, LuAlignLeft, LuAlignRight } from "react-icons/lu";
import type { IconType } from "react-icons";
import { TEXT_ALIGNS, type TextAlign } from "../../../lib/elements/types";
import type { Option } from "./StyleControls";
import type { Messages } from "../../../i18n/messages";

const ALIGN_ICONS: Record<TextAlign, IconType> = {
  left: LuAlignLeft,
  center: LuAlignCenter,
  right: LuAlignRight,
};

export function alignOptions(messages: Messages): Option<TextAlign>[] {
  return TEXT_ALIGNS.map((value) => ({ value, label: messages.text.aligns[value], icon: ALIGN_ICONS[value] }));
}
