import { useState } from "react";
import {
  LuAlignCenter,
  LuAlignLeft,
  LuAlignRight,
  LuAlignVerticalJustifyCenter,
  LuAlignVerticalJustifyEnd,
  LuAlignVerticalJustifyStart,
  LuBold,
  LuItalic,
} from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import {
  FONT_FAMILIES,
  type FontFamily,
  type TextAlign,
  type VerticalAlign,
} from "../../../lib/elements/types";
import { FONT_SIZE_PRESETS, FONT_STACKS } from "../../../lib/text";
import { theme } from "../../../lib/theme";
import { useBoardStore } from "../../../store/boardStore";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { PanelSection } from "../../../ui/Panel/Panel";
import { AUTO_COLOR, ColorField, type Swatch } from "./ColorField";
import { selectTextScope, styleSelectors, textSelectors } from "./selectors";
import { OpacityField, OptionGroup, type Option } from "./StyleControls";
import { useStylePreview } from "./useStylePreview";
import { SHORTCUTS, formatShortcut } from "../shortcuts";

const { palette } = theme;

const TEXT_SWATCHES: Swatch[] = [
  { color: AUTO_COLOR, label: "Automática (cor do contorno)" },
  { color: palette.ink, label: "Preto" },
  { color: palette.red, label: "Vermelho" },
  { color: palette.green, label: "Verde" },
  { color: palette.blue, label: "Azul" },
  { color: palette.amber, label: "Âmbar" },
];

const FONT_LABELS: Record<FontFamily, string> = {
  hand: "Manuscrita",
  sans: "Sem serifa",
  mono: "Monoespaçada",
};

const FONT_OPTIONS: Option<FontFamily>[] = FONT_FAMILIES.map((fontFamily) => ({
  value: fontFamily,
  label: FONT_LABELS[fontFamily],
  icon: () => (
    <span className={styles.fontSample} style={{ fontFamily: FONT_STACKS[fontFamily] }}>
      Aa
    </span>
  ),
}));

const SIZE_NAMES = ["P", "M", "G", "GG"];
const SIZE_LABELS = ["Pequeno", "Médio", "Grande", "Muito grande"];

const SIZE_OPTIONS: Option<number>[] = FONT_SIZE_PRESETS.map((size, i) => ({
  value: size,
  label: `${SIZE_LABELS[i]} (${size})`,
  icon: () => <span className={styles.sizeLabel}>{SIZE_NAMES[i]}</span>,
}));

const ALIGN_OPTIONS: Option<TextAlign>[] = [
  { value: "left", label: "Alinhar à esquerda", icon: LuAlignLeft },
  { value: "center", label: "Centralizar", icon: LuAlignCenter },
  { value: "right", label: "Alinhar à direita", icon: LuAlignRight },
];

const VERTICAL_ALIGN_OPTIONS: Option<VerticalAlign>[] = [
  { value: "top", label: "Topo", icon: LuAlignVerticalJustifyStart },
  { value: "middle", label: "Meio", icon: LuAlignVerticalJustifyCenter },
  { value: "bottom", label: "Base", icon: LuAlignVerticalJustifyEnd },
];

const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 200;

function FontSizeInput({
  value,
  onPreview,
  onCommit,
}: {
  value: number | "mixed";
  onPreview: (size: number) => void;
  onCommit: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === "mixed" ? "" : String(Math.round(value)));

  return (
    <input
      className={styles.sizeInput}
      type="number"
      min={MIN_FONT_SIZE}
      max={MAX_FONT_SIZE}
      value={shown}
      aria-label="Tamanho da fonte"
      onChange={(e) => {
        setDraft(e.target.value);
        const size = Number(e.target.value);
        if (e.target.value !== "" && size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) onPreview(size);
      }}
      onBlur={() => {
        setDraft(null);
        onCommit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

export function TextControls() {
  const scope = useBoardStore(selectTextScope).split(",");
  const fontFamily = useBoardStore(textSelectors.fontFamily);
  const fontSize = useBoardStore(textSelectors.fontSize);
  const color = useBoardStore(textSelectors.color);
  const bold = useBoardStore(textSelectors.bold);
  const italic = useBoardStore(textSelectors.italic);
  const align = useBoardStore(textSelectors.align);
  const verticalAlign = useBoardStore(textSelectors.verticalAlign);
  const opacity = useBoardStore(styleSelectors.strokeOpacity);
  const setTextStyle = useBoardStore((s) => s.setTextStyle);
  const { preview, previewText, commit } = useStylePreview();

  const hasFree = scope.includes("free");
  const hasBox = scope.includes("box");
  const colorValue = color === null ? AUTO_COLOR : color;
  const toColor = (value: string) => (value === AUTO_COLOR ? null : value);

  return (
    <>
      <PanelSection title="Fonte">
        <OptionGroup
          options={FONT_OPTIONS}
          value={fontFamily}
          onChange={(value) => setTextStyle({ fontFamily: value })}
        />
      </PanelSection>
      <PanelSection title="Tamanho">
        <div className={styles.textRow}>
          <OptionGroup
            options={SIZE_OPTIONS}
            value={fontSize}
            onChange={(value) => setTextStyle({ fontSize: value })}
          />
          <FontSizeInput value={fontSize} onPreview={(size) => previewText({ fontSize: size })} onCommit={commit} />
        </div>
      </PanelSection>
      <PanelSection title="Estilo">
        <div className={styles.options}>
          <IconButton
            icon={LuBold}
            label="Negrito"
            shortcut={formatShortcut(SHORTCUTS.bold.keys)}
            size="sm"
            tooltipSide="bottom"
            active={bold === true}
            onClick={() => setTextStyle({ bold: bold !== true })}
          />
          <IconButton
            icon={LuItalic}
            label="Itálico"
            shortcut={formatShortcut(SHORTCUTS.italic.keys)}
            size="sm"
            tooltipSide="bottom"
            active={italic === true}
            onClick={() => setTextStyle({ italic: italic !== true })}
          />
        </div>
      </PanelSection>
      <PanelSection title="Cor">
        <ColorField
          title="Cor do texto"
          value={colorValue}
          swatches={TEXT_SWATCHES}
          onChange={(value) => setTextStyle({ color: toColor(value) })}
          onPreview={(value) => previewText({ color: toColor(value) })}
          onPreviewEnd={commit}
        />
      </PanelSection>
      {(hasFree || hasBox) && (
        <PanelSection title="Alinhamento">
          <div className={styles.textRow}>
            <OptionGroup options={ALIGN_OPTIONS} value={align} onChange={(value) => setTextStyle({ align: value })} />
            {hasBox && (
              <OptionGroup
                options={VERTICAL_ALIGN_OPTIONS}
                value={verticalAlign}
                onChange={(value) => setTextStyle({ verticalAlign: value })}
              />
            )}
          </div>
        </PanelSection>
      )}
      {hasFree && (
        <PanelSection title="Opacidade">
          <OpacityField value={opacity} onPreview={(value) => preview({ strokeOpacity: value })} onCommit={commit} />
        </PanelSection>
      )}
    </>
  );
}
