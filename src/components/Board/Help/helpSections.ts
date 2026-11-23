import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { LuCompass, LuKeyboard, LuMousePointerClick, LuPalette, LuRocket, LuType, LuWorkflow } from "react-icons/lu";
import { DiagramsHelp, NavigationHelp, ShortcutTable, StartHelp, StyleHelp, TextHelp, ToolList } from "./HelpBlocks";
import { canEdit, type WhiteboardConfig } from "../../../store/whiteboardConfig";
import type { HelpSectionId } from "../../../i18n/messages";

export interface HelpSection {
  id: HelpSectionId;
  icon: IconType;
  Content: () => ReactNode;
  visible?: (config: WhiteboardConfig) => boolean;
}

export const HELP_SECTIONS: HelpSection[] = [
  { id: "start", visible: canEdit, icon: LuRocket, Content: StartHelp },
  { id: "tools", visible: (config) => config.tools.length > 0, icon: LuMousePointerClick, Content: ToolList },
  { id: "diagrams", visible: canEdit, icon: LuWorkflow, Content: DiagramsHelp },
  { id: "text", visible: canEdit, icon: LuType, Content: TextHelp },
  { id: "style", visible: canEdit, icon: LuPalette, Content: StyleHelp },
  { id: "navigation", icon: LuCompass, Content: NavigationHelp },
  { id: "shortcuts", icon: LuKeyboard, Content: ShortcutTable },
];
