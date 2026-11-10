import type { IconType } from "react-icons";
import { LuArrowLeftRight } from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import {
  FILL_STYLES,
  STROKE_STYLES,
  TRANSPARENT,
  type FillStyle,
  type StrokeStyle,
} from "../../../lib/elements/types";
import { theme } from "../../../lib/theme";
import { useBoardStore } from "../../../store/boardStore";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { PanelSection } from "../../../ui/Panel/Panel";
import { ArrowheadPicker } from "./ArrowheadPicker";
import { ColorField, type Swatch } from "./ColorField";
import { ROUTING_OPTIONS } from "./routing";
import { arrowSelectors, scopeSupports, selectScope, styleSelectors } from "./selectors";
import { FillStyleIcon, RoughnessIcon, StrokeStyleIcon, StrokeWidthIcon } from "./StyleIcons";
import { useStylePreview } from "./useStylePreview";

const { palette } = theme;

const STROKE_SWATCHES: Swatch[] = [
  { color: palette.ink, label: "Preto" },
  { color: palette.red, label: "Vermelho" },
  { color: palette.green, label: "Verde" },
  { color: palette.blue, label: "Azul" },
  { color: palette.amber, label: "Âmbar" },
];

const FILL_SWATCHES: Swatch[] = [
  { color: TRANSPARENT, label: "Sem preenchimento" },
  { color: palette.redLight, label: "Vermelho claro" },
  { color: palette.greenLight, label: "Verde claro" },
  { color: palette.blueLight, label: "Azul claro" },
  { color: palette.amberLight, label: "Âmbar claro" },
];

export interface Option<T> {
  value: T;
  label: string;
  icon: IconType;
}

const FILL_STYLE_LABELS: Record<FillStyle, string> = {
  hachure: "Hachura",
  "cross-hatch": "Hachura cruzada",
  solid: "Sólido",
};

const FILL_STYLE_OPTIONS: Option<FillStyle>[] = FILL_STYLES.map((fillStyle) => ({
  value: fillStyle,
  label: FILL_STYLE_LABELS[fillStyle],
  icon: () => <FillStyleIcon fillStyle={fillStyle} />,
}));

const STROKE_WIDTH_OPTIONS: Option<number>[] = [
  { value: 1, label: "Fina", icon: () => <StrokeWidthIcon width={1.25} /> },
  { value: 2, label: "Média", icon: () => <StrokeWidthIcon width={2.5} /> },
  { value: 4, label: "Grossa", icon: () => <StrokeWidthIcon width={4} /> },
];

const STROKE_STYLE_LABELS: Record<StrokeStyle, string> = {
  solid: "Contínuo",
  dashed: "Tracejado",
  dotted: "Pontilhado",
};

const STROKE_STYLE_OPTIONS: Option<StrokeStyle>[] = STROKE_STYLES.map((strokeStyle) => ({
  value: strokeStyle,
  label: STROKE_STYLE_LABELS[strokeStyle],
  icon: () => <StrokeStyleIcon strokeStyle={strokeStyle} />,
}));

const ROUGHNESS_OPTIONS: Option<number>[] = [
  { value: 0, label: "Limpo", icon: () => <RoughnessIcon roughness={0} /> },
  { value: 1, label: "Esboço", icon: () => <RoughnessIcon roughness={1} /> },
  { value: 2, label: "Esboço forte", icon: () => <RoughnessIcon roughness={2} /> },
];

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
  return (
    <div className={styles.opacity}>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value === "mixed" ? 100 : value}
        aria-label="Opacidade"
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
  const scope = useBoardStore(selectScope);
  const color = useBoardStore(styleSelectors.strokeColor);
  const width = useBoardStore(styleSelectors.strokeWidth);
  const lineStyle = useBoardStore(styleSelectors.strokeStyle);
  const roughness = useBoardStore(styleSelectors.strokeRoughness);
  const opacity = useBoardStore(styleSelectors.strokeOpacity);
  const setStyle = useBoardStore((s) => s.setStyle);
  const { preview, commit } = useStylePreview();

  return (
    <>
      <PanelSection title="Cor">
        <ColorField
          title="Contorno"
          value={color}
          swatches={STROKE_SWATCHES}
          onChange={(value) => setStyle({ strokeColor: value })}
          onPreview={(value) => preview({ strokeColor: value })}
          onPreviewEnd={commit}
        />
      </PanelSection>
      {scopeSupports(scope, "strokeWidth") && (
        <PanelSection title="Espessura">
          <OptionGroup
            options={STROKE_WIDTH_OPTIONS}
            value={width}
            onChange={(value) => setStyle({ strokeWidth: value })}
          />
        </PanelSection>
      )}
      {scopeSupports(scope, "strokeStyle") && (
        <PanelSection title="Estilo do traço">
          <OptionGroup
            options={STROKE_STYLE_OPTIONS}
            value={lineStyle}
            onChange={(value) => setStyle({ strokeStyle: value })}
          />
        </PanelSection>
      )}
      {scopeSupports(scope, "strokeRoughness") && (
        <PanelSection title="Esboço">
          <OptionGroup
            options={ROUGHNESS_OPTIONS}
            value={roughness}
            onChange={(value) => setStyle({ strokeRoughness: value })}
          />
        </PanelSection>
      )}
      <PanelSection title="Opacidade">
        <OpacityField value={opacity} onPreview={(value) => preview({ strokeOpacity: value })} onCommit={commit} />
      </PanelSection>
    </>
  );
}

export function FillControls() {
  const color = useBoardStore(styleSelectors.fillColor);
  const fillStyle = useBoardStore(styleSelectors.fillStyle);
  const roughness = useBoardStore(styleSelectors.fillRoughness);
  const opacity = useBoardStore(styleSelectors.fillOpacity);
  const setStyle = useBoardStore((s) => s.setStyle);
  const { preview, commit } = useStylePreview();

  const hasFill = color !== TRANSPARENT;

  return (
    <>
      <PanelSection title="Cor">
        <ColorField
          title="Preenchimento"
          value={color}
          swatches={FILL_SWATCHES}
          onChange={(value) => setStyle({ fillColor: value })}
          onPreview={(value) => preview({ fillColor: value })}
          onPreviewEnd={commit}
        />
      </PanelSection>
      {hasFill && (
        <>
          <PanelSection title="Estilo">
            <OptionGroup
              options={FILL_STYLE_OPTIONS}
              value={fillStyle}
              onChange={(value) => setStyle({ fillStyle: value })}
            />
          </PanelSection>
          <PanelSection title="Esboço">
            <OptionGroup
              options={ROUGHNESS_OPTIONS}
              value={roughness}
              onChange={(value) => setStyle({ fillRoughness: value })}
            />
          </PanelSection>
          <PanelSection title="Opacidade">
            <OpacityField value={opacity} onPreview={(value) => preview({ fillOpacity: value })} onCommit={commit} />
          </PanelSection>
        </>
      )}
    </>
  );
}

export function ArrowControls() {
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
      <PanelSection title="Tipo de seta">
        <OptionGroup
          options={ROUTING_OPTIONS.map(({ routing: value, label, icon }) => ({ value, label, icon }))}
          value={routing}
          onChange={setArrowRouting}
        />
      </PanelSection>
      <PanelSection title="Pontas">
        <div className={styles.arrowheads}>
          <div className={styles.arrowPreview}>
            <ArrowheadPicker end="start" value={start} onChange={(value) => setArrowhead("start", value)} />
            <ArrowheadPicker end="end" value={end} onChange={(value) => setArrowhead("end", value)} />
          </div>
          <IconButton
            icon={LuArrowLeftRight}
            label="Inverter pontas"
            size="sm"
            tooltipSide="bottom"
            onClick={swapArrowheads}
          />
        </div>
      </PanelSection>
    </>
  );
}
