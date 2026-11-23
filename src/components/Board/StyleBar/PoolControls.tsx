import { LuBetweenHorizontalEnd, LuTableRowsSplit } from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import { removePoolLane } from "../../../lib/elements/pool";
import { useBoardStore } from "../../../store/boardStoreContext";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { PanelSection } from "../../../ui/Panel/Panel";
import { selectPoolLane } from "./selectors";
import { useMessages } from "../../../i18n/useMessages";

export function PoolControls() {
  const laneSelected = useBoardStore(selectPoolLane);
  const canRemove = useBoardStore((s) => removePoolLane(s.elements, s.selectedIds) !== null);
  const changePoolLanes = useBoardStore((s) => s.changePoolLanes);
  const messages = useMessages();

  return (
    <PanelSection title={messages.pool.lanes}>
      <div className={styles.options}>
        <IconButton
          icon={LuBetweenHorizontalEnd}
          label={laneSelected ? messages.pool.insertLaneBelow : messages.pool.insertLaneAtEnd}
          size="sm"
          tooltipSide="bottom"
          onClick={() => changePoolLanes("add")}
        />
        <IconButton
          icon={LuTableRowsSplit}
          label={laneSelected ? messages.pool.deleteLane : messages.pool.deleteLastLane}
          size="sm"
          tooltipSide="bottom"
          disabled={!canRemove}
          onClick={() => changePoolLanes("remove")}
        />
      </div>
    </PanelSection>
  );
}
