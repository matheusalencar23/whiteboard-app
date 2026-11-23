import type { IconType } from "react-icons";
import {
  LuCircle,
  LuDiamond,
  LuHand,
  LuMousePointer2,
  LuMoveRight,
  LuPencil,
  LuSquare,
  LuType,
} from "react-icons/lu";
import type { Tool } from "../../../store/boardStore";

export interface ToolDefinition {
  tool: Tool;
  icon: IconType;
  keys: string[];
}

export const TOOLS: ToolDefinition[] = [
  { tool: "hand", icon: LuHand, keys: ["h"] },
  { tool: "selection", icon: LuMousePointer2, keys: ["v", "1"] },
  { tool: "rectangle", icon: LuSquare, keys: ["r", "2"] },
  { tool: "diamond", icon: LuDiamond, keys: ["d", "3"] },
  { tool: "ellipse", icon: LuCircle, keys: ["o", "4"] },
  { tool: "arrow", icon: LuMoveRight, keys: ["a", "5"] },
  { tool: "freedraw", icon: LuPencil, keys: ["p", "6"] },
  { tool: "text", icon: LuType, keys: ["t", "7"] },
];
