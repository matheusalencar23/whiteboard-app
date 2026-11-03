import type { IconType } from "react-icons";
import { LuCornerDownRight, LuMoveRight, LuSpline } from "react-icons/lu";
import styles from "./StylePanel.module.scss";
import type { ArrowRouting } from "../../../lib/elements/types";
import { useBoardStore, type BoardState } from "../../../store/boardStore";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { Panel, PanelSection } from "../../../ui/Panel/Panel";

const ROUTING_OPTIONS: { routing: ArrowRouting; label: string; icon: IconType }[] = [
  { routing: "straight", label: "Reta", icon: LuMoveRight },
  { routing: "curved", label: "Curva", icon: LuSpline },
  { routing: "elbow", label: "Ortogonal", icon: LuCornerDownRight },
];

function selectedArrowRouting(state: BoardState): ArrowRouting | "mixed" | null {
  const ids = new Set(state.selectedIds);
  let routing: ArrowRouting | null = null;
  for (const el of state.elements) {
    if (el.type !== "arrow" || !ids.has(el.id)) continue;
    if (routing === null) routing = el.routing;
    else if (routing !== el.routing) return "mixed";
  }
  return routing;
}

export function StylePanel() {
  const tool = useBoardStore((s) => s.tool);
  const defaultRouting = useBoardStore((s) => s.arrowRouting);
  const selectedRouting = useBoardStore(selectedArrowRouting);
  const setArrowRouting = useBoardStore((s) => s.setArrowRouting);

  const showArrowOptions = tool === "arrow" || selectedRouting !== null;
  if (!showArrowOptions) return null;

  const active = selectedRouting ?? defaultRouting;

  return (
    <Panel label="Estilo">
      <PanelSection title="Tipo de seta">
        <div className={styles.options}>
          {ROUTING_OPTIONS.map(({ routing, label, icon }) => (
            <IconButton
              key={routing}
              icon={icon}
              label={label}
              size="sm"
              tooltipSide="bottom"
              active={active === routing}
              onClick={() => setArrowRouting(routing)}
            />
          ))}
        </div>
      </PanelSection>
    </Panel>
  );
}
