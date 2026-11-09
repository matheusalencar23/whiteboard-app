import type { IconType } from "react-icons";
import { LuCornerDownRight, LuMoveRight, LuSpline } from "react-icons/lu";
import styles from "./StylePanel.module.scss";
import type { ArrowElement, ArrowRouting } from "../../../lib/elements/types";
import { useBoardStore, type BoardState } from "../../../store/boardStore";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { Panel, PanelSection } from "../../../ui/Panel/Panel";
import { ArrowheadPicker } from "./ArrowheadPicker";

const ROUTING_OPTIONS: { routing: ArrowRouting; label: string; icon: IconType }[] = [
  { routing: "straight", label: "Reta", icon: LuMoveRight },
  { routing: "curved", label: "Curva", icon: LuSpline },
  { routing: "elbow", label: "Ortogonal", icon: LuCornerDownRight },
];

type ArrowField = "routing" | "startArrowhead" | "endArrowhead";

function selectArrowField<K extends ArrowField>(key: K) {
  return (state: BoardState): ArrowElement[K] | "mixed" | null => {
    const ids = new Set(state.selectedIds);
    let value: ArrowElement[K] | null = null;
    for (const el of state.elements) {
      if (el.type !== "arrow" || !ids.has(el.id)) continue;
      if (value === null) value = el[key];
      else if (value !== el[key]) return "mixed";
    }
    return value;
  };
}

const selectRouting = selectArrowField("routing");
const selectStartArrowhead = selectArrowField("startArrowhead");
const selectEndArrowhead = selectArrowField("endArrowhead");

export function StylePanel() {
  const tool = useBoardStore((s) => s.tool);
  const defaultRouting = useBoardStore((s) => s.arrowRouting);
  const defaultStart = useBoardStore((s) => s.arrowheads.start);
  const defaultEnd = useBoardStore((s) => s.arrowheads.end);
  const selectedRouting = useBoardStore(selectRouting);
  const selectedStart = useBoardStore(selectStartArrowhead);
  const selectedEnd = useBoardStore(selectEndArrowhead);
  const setArrowRouting = useBoardStore((s) => s.setArrowRouting);
  const setArrowhead = useBoardStore((s) => s.setArrowhead);

  const showArrowOptions = tool === "arrow" || selectedRouting !== null;
  if (!showArrowOptions) return null;

  const activeRouting = selectedRouting ?? defaultRouting;
  const activeArrowheads = { start: selectedStart ?? defaultStart, end: selectedEnd ?? defaultEnd };

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
              active={activeRouting === routing}
              onClick={() => setArrowRouting(routing)}
            />
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Pontas">
        <div className={styles.options}>
          <ArrowheadPicker
            end="start"
            value={activeArrowheads.start}
            onChange={(arrowhead) => setArrowhead("start", arrowhead)}
          />
          <ArrowheadPicker
            end="end"
            value={activeArrowheads.end}
            onChange={(arrowhead) => setArrowhead("end", arrowhead)}
          />
        </div>
      </PanelSection>
    </Panel>
  );
}
