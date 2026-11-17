import type { IconType } from "react-icons";
import { LuArrowDown, LuArrowUp, LuBringToFront, LuSendToBack } from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import { ORDER_DIRECTIONS, reorderElements, type OrderDirection } from "../../../lib/elements/order";
import { type BoardState } from "../../../store/boardStore";
import { useBoardStore } from "../../../store/boardStoreContext";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { PanelSection } from "../../../ui/Panel/Panel";
import { SHORTCUTS, formatShortcut, type Shortcut } from "../shortcuts";

const ORDER_ACTIONS: Record<OrderDirection, { shortcut: Shortcut; icon: IconType }> = {
  front: { shortcut: SHORTCUTS.bringToFront, icon: LuBringToFront },
  forward: { shortcut: SHORTCUTS.bringForward, icon: LuArrowUp },
  backward: { shortcut: SHORTCUTS.sendBackward, icon: LuArrowDown },
  back: { shortcut: SHORTCUTS.sendToBack, icon: LuSendToBack },
};

function canReorder(direction: OrderDirection) {
  return (state: BoardState) =>
    reorderElements(state.elements, state.selectedIds, state.editingGroupId, direction) !== null;
}

function OrderButton({ direction }: { direction: OrderDirection }) {
  const enabled = useBoardStore(canReorder(direction));
  const reorderSelection = useBoardStore((s) => s.reorderSelection);
  const { shortcut, icon } = ORDER_ACTIONS[direction];
  return (
    <IconButton
      icon={icon}
      label={shortcut.label}
      shortcut={formatShortcut(shortcut.keys)}
      size="sm"
      tooltipSide="bottom"
      disabled={!enabled}
      onClick={() => reorderSelection(direction)}
    />
  );
}

export function OrderControls() {
  return (
    <PanelSection title="Ordem de desenho">
      <div className={styles.options}>
        {ORDER_DIRECTIONS.map((direction) => (
          <OrderButton key={direction} direction={direction} />
        ))}
      </div>
    </PanelSection>
  );
}
