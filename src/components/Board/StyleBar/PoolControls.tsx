import { LuBetweenHorizontalEnd, LuTableRowsSplit } from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import { removePoolLane } from "../../../lib/elements/pool";
import { useBoardStore } from "../../../store/boardStoreContext";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { PanelSection } from "../../../ui/Panel/Panel";
import { selectPoolLane } from "./selectors";

export function PoolControls() {
  const laneSelected = useBoardStore(selectPoolLane);
  const canRemove = useBoardStore((s) => removePoolLane(s.elements, s.selectedIds) !== null);
  const changePoolLanes = useBoardStore((s) => s.changePoolLanes);

  return (
    <PanelSection title="Raias">
      <div className={styles.options}>
        <IconButton
          icon={LuBetweenHorizontalEnd}
          label={laneSelected ? "Inserir raia abaixo" : "Inserir raia no fim"}
          size="sm"
          tooltipSide="bottom"
          onClick={() => changePoolLanes("add")}
        />
        <IconButton
          icon={LuTableRowsSplit}
          label={laneSelected ? "Apagar raia" : "Apagar a última raia"}
          size="sm"
          tooltipSide="bottom"
          disabled={!canRemove}
          onClick={() => changePoolLanes("remove")}
        />
      </div>
    </PanelSection>
  );
}
