import { useCallback, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { LuPalette } from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import { TRANSPARENT } from "../../../lib/elements/types";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { Panel, PanelSection } from "../../../ui/Panel/Panel";
import { Popover } from "../../../ui/Popover/Popover";
import { ColorPicker } from "./ColorPicker";

export interface Swatch {
  color: string;
  label: string;
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className={styles.swatch}
      data-transparent={color === TRANSPARENT}
      style={color === TRANSPARENT ? undefined : { background: color }}
    />
  );
}

const swatchIcons = new Map<string, IconType>();

function swatchIcon(color: string): IconType {
  let icon = swatchIcons.get(color);
  if (!icon) {
    icon = () => <Swatch color={color} />;
    swatchIcons.set(color, icon);
  }
  return icon;
}

interface ColorFieldProps {
  title: string;
  value: string | "mixed";
  swatches: Swatch[];
  onChange: (color: string) => void;
  onPreview: (color: string) => void;
  onPreviewEnd: () => void;
}

export function ColorField({ title, value, swatches, onChange, onPreview, onPreviewEnd }: ColorFieldProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => {
    setAnchor(null);
    onPreviewEnd();
  }, [onPreviewEnd]);

  const isCustom = value !== "mixed" && !swatches.some((s) => s.color === value);

  return (
    <div className={styles.options}>
      {swatches.map(({ color, label }) => (
        <IconButton
          key={color}
          icon={swatchIcon(color)}
          label={label}
          size="sm"
          tooltipSide="bottom"
          active={value === color}
          onClick={() => onChange(color)}
        />
      ))}
      <div ref={anchorRef}>
        <IconButton
          icon={isCustom ? swatchIcon(value) : LuPalette}
          label={isCustom ? `Cor personalizada: ${value}` : "Cor personalizada"}
          size="sm"
          tooltipSide="bottom"
          hasPopup
          active={anchor !== null || isCustom}
          onClick={() => (anchor ? close() : setAnchor(anchorRef.current))}
        />
      </div>
      {anchor && (
        <Popover anchor={anchor} side="right" boundary={anchor.closest("aside")} onClose={close}>
          <Panel label={title}>
            <PanelSection title={title}>
              <ColorPicker
                color={value === "mixed" || value === TRANSPARENT ? undefined : value}
                onChange={(color) => onPreview(color.hex)}
              />
            </PanelSection>
          </Panel>
        </Popover>
      )}
    </div>
  );
}
