import type { IconType } from "react-icons";
import { LuCornerDownRight, LuMoveRight, LuSpline } from "react-icons/lu";
import type { ArrowRouting } from "../../../lib/elements/types";

export const ROUTING_OPTIONS: { routing: ArrowRouting; icon: IconType }[] = [
  { routing: "straight", icon: LuMoveRight },
  { routing: "curved", icon: LuSpline },
  { routing: "elbow", icon: LuCornerDownRight },
];
