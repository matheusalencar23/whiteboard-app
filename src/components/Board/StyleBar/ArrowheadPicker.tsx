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
import type { Messages } from "../../../i18n/messages";
import { useMessages } from "../../../i18n/useMessages";

const ARROWHEAD_GROUPS: { title: keyof Messages["arrow"]["groups"]; arrowheads: Arrowhead[] }[] = [
  { title: "basic", arrowheads: ["none", "arrow", "bar", "cross"] },
  {
    title: "uml",
    arrowheads: ["triangle", "triangleOutline", "diamond", "diamondOutline", "circle", "circleOutline"],
  },
  {
    title: "er",
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

interface ArrowheadPickerProps {
  end: ArrowEnd;
  value: Arrowhead | "mixed";
  onChange: (arrowhead: Arrowhead) => void;
}

export function ArrowheadPicker({ end, value, onChange }: ArrowheadPickerProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);

  const messages = useMessages();
  const title = messages.arrow[end];
  const current = value === "mixed" ? messages.common.mixed : messages.arrow.shapes[value];

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
              <PanelSection key={group.title} title={messages.arrow.groups[group.title]}>
                <div className={styles.grid}>
                  {group.arrowheads.map((arrowhead) => (
                    <IconButton
                      key={arrowhead}
                      icon={ICONS[end][arrowhead]}
                      label={messages.arrow.shapes[arrowhead]}
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
