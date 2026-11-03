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
  label: string;
  icon: IconType;
  keys: string[];
}

export const TOOLS: ToolDefinition[] = [
  { tool: "hand", label: "Mover tela", icon: LuHand, keys: ["h"] },
  { tool: "selection", label: "Seleção", icon: LuMousePointer2, keys: ["v", "1"] },
  { tool: "rectangle", label: "Retângulo", icon: LuSquare, keys: ["r", "2"] },
  { tool: "diamond", label: "Losango", icon: LuDiamond, keys: ["d", "3"] },
  { tool: "ellipse", label: "Elipse", icon: LuCircle, keys: ["o", "4"] },
  { tool: "arrow", label: "Seta", icon: LuMoveRight, keys: ["a", "5"] },
  { tool: "freedraw", label: "Lápis", icon: LuPencil, keys: ["p", "6"] },
  { tool: "text", label: "Texto", icon: LuType, keys: ["t", "7"] },
];
