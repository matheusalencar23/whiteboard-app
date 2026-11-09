import { useCallback, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { LuEllipsis } from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import { ARROWHEADS, type Arrowhead } from "../../../lib/elements/types";
import type { ArrowEnd } from "../../../lib/elements/bindings";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { Panel, PanelSection } from "../../../ui/Panel/Panel";
import { Popover } from "../../../ui/Popover/Popover";
import { ArrowheadIcon } from "./ArrowheadIcon";

const ARROWHEAD_LABELS: Record<Arrowhead, string> = {
  none: "Nenhuma",
  arrow: "Seta",
  bar: "Barra",
  cross: "X",
  triangle: "Triângulo",
  triangleOutline: "Triângulo vazado",
  diamond: "Losango",
  diamondOutline: "Losango vazado",
  circle: "Círculo",
  circleOutline: "Círculo vazado",
  erOne: "Um",
  erMandOne: "Um e somente um",
  erMany: "Muitos",
  erOneToMany: "Um ou muitos",
  erZeroToOne: "Zero ou um",
  erZeroToMany: "Zero ou muitos",
};

const ARROWHEAD_GROUPS: { title: string; arrowheads: Arrowhead[] }[] = [
  { title: "Básicas", arrowheads: ["none", "arrow", "bar", "cross"] },
  {
    title: "UML",
    arrowheads: ["triangle", "triangleOutline", "diamond", "diamondOutline", "circle", "circleOutline"],
  },
  {
    title: "ER",
    arrowheads: ["erOne", "erMandOne", "erMany", "erOneToMany", "erZeroToOne", "erZeroToMany"],
  },
];

function iconsFor(end: ArrowEnd, bleed: boolean): Record<Arrowhead, IconType> {
  const icons = {} as Record<Arrowhead, IconType>;
  for (const arrowhead of ARROWHEADS) {
    icons[arrowhead] = () => <ArrowheadIcon arrowhead={arrowhead} end={end} bleed={bleed} />;
  }
  return icons;
}

const ICONS: Record<ArrowEnd, Record<Arrowhead, IconType>> = {
  start: iconsFor("start", false),
  end: iconsFor("end", false),
};

const PREVIEW_ICONS: Record<ArrowEnd, Record<Arrowhead, IconType>> = {
  start: iconsFor("start", true),
  end: iconsFor("end", true),
};

const END_TITLES: Record<ArrowEnd, string> = { start: "Ponta inicial", end: "Ponta final" };

interface ArrowheadPickerProps {
  end: ArrowEnd;
  value: Arrowhead | "mixed";
  onChange: (arrowhead: Arrowhead) => void;
}

export function ArrowheadPicker({ end, value, onChange }: ArrowheadPickerProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);

  const title = END_TITLES[end];
  const current = value === "mixed" ? "Vários" : ARROWHEAD_LABELS[value];

  return (
    <div ref={anchorRef}>
      <IconButton
        icon={value === "mixed" ? LuEllipsis : PREVIEW_ICONS[end][value]}
        label={`${title}: ${current}`}
        size="sm"
        tooltipSide="bottom"
        hasPopup
        active={anchor !== null}
        onClick={() => setAnchor((open) => (open ? null : anchorRef.current))}
      />
      {anchor && (
        <Popover anchor={anchor} side="right" boundary={anchor.closest("aside")} onClose={close}>
          <Panel label={title}>
            {ARROWHEAD_GROUPS.map((group) => (
              <PanelSection key={group.title} title={group.title}>
                <div className={styles.grid}>
                  {group.arrowheads.map((arrowhead) => (
                    <IconButton
                      key={arrowhead}
                      icon={ICONS[end][arrowhead]}
                      label={ARROWHEAD_LABELS[arrowhead]}
                      tooltipSide="top"
                      active={value === arrowhead}
                      onClick={() => {
                        onChange(arrowhead);
                        close();
                      }}
                    />
                  ))}
                </div>
              </PanelSection>
            ))}
          </Panel>
        </Popover>
      )}
    </div>
  );
}
