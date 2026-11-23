import { useState } from "react";
import { LuMinus, LuPlus } from "react-icons/lu";
import styles from "./ZoomIndicator.module.scss";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { Tooltip } from "../../../ui/Tooltip/Tooltip";
import { useBoardStore } from "../../../store/boardStoreContext";
import { nextZoomStep } from "../../../lib/viewport";
import type { BoardState } from "../../../store/boardStore";
import { SHORTCUTS, formatShortcut } from "../shortcuts";
import { useMessages } from "../../../i18n/useMessages";

function canStepZoom(state: BoardState, direction: 1 | -1): boolean {
  return nextZoomStep(state.viewport.zoom, direction, state.config.zoomSteps) !== state.viewport.zoom;
}

export function ZoomIndicator() {
  const messages = useMessages();
  const zoom = useBoardStore((s) => s.viewport.zoom);
  const stepZoom = useBoardStore((s) => s.stepZoom);
  const resetZoom = useBoardStore((s) => s.resetZoom);
  const canZoomOut = useBoardStore((s) => canStepZoom(s, -1));
  const canZoomIn = useBoardStore((s) => canStepZoom(s, 1));
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  function showTooltip(e: React.SyntheticEvent<HTMLButtonElement>) {
    setAnchor(e.currentTarget.getBoundingClientRect());
  }

  return (
    <div className={styles.zoom} role="group" aria-label={messages.zoom.group}>
      <IconButton
        icon={LuMinus}
        label={messages.shortcuts.zoomOut}
        shortcut={formatShortcut(SHORTCUTS.zoomOut.keys)}
        size="sm"
        tooltipSide="top"
        disabled={!canZoomOut}
        onClick={() => stepZoom(-1)}
      />
      <button
        type="button"
        className={styles.value}
        aria-label={messages.zoom.current(Math.round(zoom * 100))}
        onPointerEnter={showTooltip}
        onPointerLeave={() => setAnchor(null)}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) showTooltip(e);
        }}
        onBlur={() => setAnchor(null)}
        onClick={() => {
          resetZoom();
          setAnchor(null);
        }}
      >
        {Math.round(zoom * 100)}%
      </button>
      {anchor && <Tooltip anchor={anchor} side="top" label={messages.zoom.reset} shortcut={formatShortcut(SHORTCUTS.zoomReset.keys)} />}
      <IconButton
        icon={LuPlus}
        label={messages.shortcuts.zoomIn}
        shortcut={formatShortcut(SHORTCUTS.zoomIn.keys)}
        size="sm"
        tooltipSide="top"
        disabled={!canZoomIn}
        onClick={() => stepZoom(1)}
      />
    </div>
  );
}
