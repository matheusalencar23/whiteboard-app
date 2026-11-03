import { useState } from "react";
import type { IconType } from "react-icons";
import styles from "./IconButton.module.scss";
import { Tooltip, type TooltipSide } from "../Tooltip/Tooltip";

interface IconButtonProps {
  icon: IconType;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
  badge?: string;
  size?: "md" | "sm";
  activeMarker?: boolean;
  tooltipSide?: TooltipSide;
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled = false,
  shortcut,
  badge,
  size = "md",
  activeMarker = false,
  tooltipSide = "right",
}: IconButtonProps) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  function showTooltip(e: React.SyntheticEvent<HTMLButtonElement>) {
    setAnchor(e.currentTarget.getBoundingClientRect());
  }

  function hideTooltip() {
    setAnchor(null);
  }

  return (
    <>
      <button
        type="button"
        className={styles.button}
        data-size={size}
        data-active={active === true}
        data-marker={activeMarker}
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onPointerEnter={showTooltip}
        onPointerLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={(e) => {
          onClick();
          e.currentTarget.blur();
        }}
      >
        <Icon />
        {badge && <span className={styles.badge}>{badge}</span>}
      </button>
      {anchor && !disabled && (
        <Tooltip anchor={anchor} side={tooltipSide} label={label} shortcut={shortcut} />
      )}
    </>
  );
}
