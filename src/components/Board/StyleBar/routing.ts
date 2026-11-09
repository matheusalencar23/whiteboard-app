import type { IconType } from "react-icons";
import { LuCornerDownRight, LuMoveRight, LuSpline } from "react-icons/lu";
import type { ArrowRouting } from "../../../lib/elements/types";

export const ROUTING_OPTIONS: { routing: ArrowRouting; label: string; icon: IconType }[] = [
  { routing: "straight", label: "Reta", icon: LuMoveRight },
  { routing: "curved", label: "Curva", icon: LuSpline },
  { routing: "elbow", label: "Ortogonal", icon: LuCornerDownRight },
];
