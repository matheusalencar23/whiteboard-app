import type { IconType } from "react-icons";
import { LuArrowLeftRight } from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import {
  CORNER_STYLES,
  FILL_STYLES,
  STROKE_STYLES,
  TRANSPARENT,
  type CornerStyle,
  type FillStyle,
  type StrokeStyle,
} from "../../../lib/elements/types";
import { useBoardStore } from "../../../store/boardStoreContext";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { PanelSection } from "../../../ui/Panel/Panel";
import { ArrowheadPicker } from "./ArrowheadPicker";
import { ColorField } from "./ColorField";
import { useFillSwatches, useStrokeSwatches } from "./swatches";
import { ROUTING_OPTIONS } from "./routing";
import { arrowSelectors, scopeSupports, selectScope, styleSelectors } from "./selectors";
import { CornerStyleIcon, FillStyleIcon, RoughnessIcon, StrokeStyleIcon, StrokeWidthIcon } from "./StyleIcons";
import { useStylePreview } from "./useStylePreview";
import { iconsFor } from "./iconsFor";
import type { Messages } from "../../../i18n/messages";
import { useMessages } from "../../../i18n/useMessages";


export interface Option<T> {
  value: T;
  label: string;
  icon: IconType;
}

const FILL_STYLE_ICONS = iconsFor(FILL_STYLES, (fillStyle) => <FillStyleIcon fillStyle={fillStyle} />);
const STROKE_STYLE_ICONS = iconsFor(STROKE_STYLES, (strokeStyle) => <StrokeStyleIcon strokeStyle={strokeStyle} />);
const CORNER_STYLE_ICONS = iconsFor(CORNER_STYLES, (corners) => <CornerStyleIcon corners={corners} />);

const STROKE_WIDTHS: { value: number; name: keyof Messages["style"]["strokeWidths"]; icon: IconType }[] = [
  { value: 1, name: "thin", icon: () => <StrokeWidthIcon width={1.25} /> },
  { value: 2, name: "medium", icon: () => <StrokeWidthIcon width={2.5} /> },
  { value: 4, name: "thick", icon: () => <StrokeWidthIcon width={4} /> },
];

const ROUGHNESS_LEVELS: { value: number; name: keyof Messages["style"]["roughnessLevels"]; icon: IconType }[] = [
  { value: 0, name: "clean", icon: () => <RoughnessIcon roughness={0} /> },
  { value: 1, name: "sketch", icon: () => <RoughnessIcon roughness={1} /> },
  { value: 2, name: "rough", icon: () => <RoughnessIcon roughness={2} /> },
];

function fillStyleOptions(messages: Messages): Option<FillStyle>[] {
  return FILL_STYLES.map((value) => ({ value, label: messages.style.fillStyles[value], icon: FILL_STYLE_ICONS[value] }));
}

function strokeStyleOptions(messages: Messages): Option<StrokeStyle>[] {
  return STROKE_STYLES.map((value) => ({ value, label: messages.style.strokeStyles[value], icon: STROKE_STYLE_ICONS[value] }));
}

function cornerStyleOptions(messages: Messages): Option<CornerStyle>[] {
  return CORNER_STYLES.map((value) => ({ value, label: messages.style.cornerStyles[value], icon: CORNER_STYLE_ICONS[value] }));
}

function strokeWidthOptions(messages: Messages): Option<number>[] {
  return STROKE_WIDTHS.map(({ value, name, icon }) => ({ value, label: messages.style.strokeWidths[name], icon }));
}

function roughnessOptions(messages: Messages): Option<number>[] {
  return ROUGHNESS_LEVELS.map(({ value, name, icon }) => ({ value, label: messages.style.roughnessLevels[name], icon }));
}

export function OptionGroup<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T | "mixed";
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.options}>
      {options.map((option) => (
        <IconButton
          key={option.value}
          icon={option.icon}
          label={option.label}
          size="sm"
          tooltipSide="bottom"
          active={value === option.value}
          onClick={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}

export function OpacityField({
  value,
  onPreview,
  onCommit,
}: {
  value: number | "mixed";
  onPreview: (value: number) => void;
  onCommit: () => void;
}) {
  const messages = useMessages();
  return (
    <div className={styles.opacity}>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value === "mixed" ? 100 : value}
        aria-label={messages.style.opacity}
        onChange={(e) => onPreview(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
      />
      <output>{value === "mixed" ? "—" : `${value}%`}</output>
    </div>
  );
}

export function StrokeControls() {
  const messages = useMessages();
  const strokeSwatches = useStrokeSwatches();
  const scope = useBoardStore(selectScope);
  const color = useBoardStore(styleSelectors.strokeColor);
  const width = useBoardStore(styleSelectors.strokeWidth);
  const lineStyle = useBoardStore(styleSelectors.strokeStyle);
  const roughness = useBoardStore(styleSelectors.strokeRoughness);
  const opacity = useBoardStore(styleSelectors.strokeOpacity);
  const corners = useBoardStore(styleSelectors.corners);
  const setStyle = useBoardStore((s) => s.setStyle);
  const { preview, commit } = useStylePreview();

  return (
    <>
      <PanelSection title={messages.style.color}>
        <ColorField
          title={messages.style.groups.stroke}
          value={color}
          swatches={strokeSwatches}
          onChange={(value) => setStyle({ strokeColor: value })}
          onPreview={(value) => preview({ strokeColor: value })}
          onPreviewEnd={commit}
        />
      </PanelSection>
      {scopeSupports(scope, "strokeWidth") && (
        <PanelSection title={messages.style.strokeWidth}>
          <OptionGroup
            options={strokeWidthOptions(messages)}
            value={width}
            onChange={(value) => setStyle({ strokeWidth: value })}
          />
        </PanelSection>
      )}
      {scopeSupports(scope, "strokeStyle") && (
        <PanelSection title={messages.style.strokeStyle}>
          <OptionGroup
            options={strokeStyleOptions(messages)}
            value={lineStyle}
            onChange={(value) => setStyle({ strokeStyle: value })}
          />
        </PanelSection>
      )}
      {scopeSupports(scope, "strokeRoughness") && (
        <PanelSection title={messages.style.roughness}>
          <OptionGroup
            options={roughnessOptions(messages)}
            value={roughness}
            onChange={(value) => setStyle({ strokeRoughness: value })}
          />
        </PanelSection>
      )}
      {scopeSupports(scope, "corners") && (
        <PanelSection title={messages.style.corners}>
          <OptionGroup options={cornerStyleOptions(messages)} value={corners} onChange={(value) => setStyle({ corners: value })} />
        </PanelSection>
      )}
      <PanelSection title={messages.style.opacity}>
        <OpacityField value={opacity} onPreview={(value) => preview({ strokeOpacity: value })} onCommit={commit} />
      </PanelSection>
    </>
  );
}

export function FillControls() {
  const messages = useMessages();
  const fillSwatches = useFillSwatches();
  const color = useBoardStore(styleSelectors.fillColor);
  const fillStyle = useBoardStore(styleSelectors.fillStyle);
  const roughness = useBoardStore(styleSelectors.fillRoughness);
  const opacity = useBoardStore(styleSelectors.fillOpacity);
  const setStyle = useBoardStore((s) => s.setStyle);
  const { preview, commit } = useStylePreview();

  const hasFill = color !== TRANSPARENT;

  return (
    <>
      <PanelSection title={messages.style.color}>
        <ColorField
          title={messages.style.groups.fill}
          value={color}
          swatches={fillSwatches}
          onChange={(value) => setStyle({ fillColor: value })}
          onPreview={(value) => preview({ fillColor: value })}
          onPreviewEnd={commit}
        />
      </PanelSection>
      {hasFill && (
        <>
          <PanelSection title={messages.style.fillStyle}>
            <OptionGroup
              options={fillStyleOptions(messages)}
              value={fillStyle}
              onChange={(value) => setStyle({ fillStyle: value })}
            />
          </PanelSection>
          <PanelSection title={messages.style.roughness}>
            <OptionGroup
              options={roughnessOptions(messages)}
              value={roughness}
              onChange={(value) => setStyle({ fillRoughness: value })}
            />
          </PanelSection>
          <PanelSection title={messages.style.opacity}>
            <OpacityField value={opacity} onPreview={(value) => preview({ fillOpacity: value })} onCommit={commit} />
          </PanelSection>
        </>
      )}
    </>
  );
}

export function ArrowControls() {
  const messages = useMessages();
  const defaultRouting = useBoardStore((s) => s.arrowRouting);
  const defaultStart = useBoardStore((s) => s.arrowheads.start);
  const defaultEnd = useBoardStore((s) => s.arrowheads.end);
  const routing = useBoardStore(arrowSelectors.routing) ?? defaultRouting;
  const start = useBoardStore(arrowSelectors.startArrowhead) ?? defaultStart;
  const end = useBoardStore(arrowSelectors.endArrowhead) ?? defaultEnd;
  const setArrowRouting = useBoardStore((s) => s.setArrowRouting);
  const setArrowhead = useBoardStore((s) => s.setArrowhead);
  const swapArrowheads = useBoardStore((s) => s.swapArrowheads);

  return (
    <>
      <PanelSection title={messages.arrow.routing}>
        <OptionGroup
          options={ROUTING_OPTIONS.map(({ routing: value, icon }) => ({ value, label: messages.arrow.routings[value], icon }))}
          value={routing}
          onChange={setArrowRouting}
        />
      </PanelSection>
      <PanelSection title={messages.arrow.arrowheads}>
        <div className={styles.arrowheads}>
          <div className={styles.arrowPreview}>
            <ArrowheadPicker end="start" value={start} onChange={(value) => setArrowhead("start", value)} />
            <ArrowheadPicker end="end" value={end} onChange={(value) => setArrowhead("end", value)} />
          </div>
          <IconButton
            icon={LuArrowLeftRight}
            label={messages.arrow.swap}
            size="sm"
            tooltipSide="bottom"
            onClick={swapArrowheads}
          />
        </div>
      </PanelSection>
    </>
  );
}
