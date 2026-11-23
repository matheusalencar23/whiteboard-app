import type { IconType } from "react-icons";
import { LuArrowDown, LuArrowUp, LuBringToFront, LuSendToBack } from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import { ORDER_DIRECTIONS, reorderElements, type OrderDirection } from "../../../lib/elements/order";
import { type BoardState } from "../../../store/boardStore";
import { useBoardStore } from "../../../store/boardStoreContext";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { PanelSection } from "../../../ui/Panel/Panel";
import { SHORTCUTS, formatShortcut, type ShortcutId } from "../shortcuts";
import { useMessages } from "../../../i18n/useMessages";

const ORDER_ACTIONS: Record<OrderDirection, { shortcut: ShortcutId; icon: IconType }> = {
  front: { shortcut: "bringToFront", icon: LuBringToFront },
  forward: { shortcut: "bringForward", icon: LuArrowUp },
  backward: { shortcut: "sendBackward", icon: LuArrowDown },
  back: { shortcut: "sendToBack", icon: LuSendToBack },
};

function canReorder(direction: OrderDirection) {
  return (state: BoardState) =>
    reorderElements(state.elements, state.selectedIds, state.editingGroupId, direction) !== null;
}

function OrderButton({ direction }: { direction: OrderDirection }) {
  const enabled = useBoardStore(canReorder(direction));
  const reorderSelection = useBoardStore((s) => s.reorderSelection);
  const messages = useMessages();
  const { shortcut, icon } = ORDER_ACTIONS[direction];
  return (
    <IconButton
      icon={icon}
      label={messages.shortcuts[shortcut]}
      shortcut={formatShortcut(SHORTCUTS[shortcut].keys)}
      size="sm"
      tooltipSide="bottom"
      disabled={!enabled}
      onClick={() => reorderSelection(direction)}
    />
  );
}

export function OrderControls() {
  const messages = useMessages();
  return (
    <PanelSection title={messages.order.title}>
      <div className={styles.options}>
        {ORDER_DIRECTIONS.map((direction) => (
          <OrderButton key={direction} direction={direction} />
        ))}
      </div>
    </PanelSection>
  );
}
