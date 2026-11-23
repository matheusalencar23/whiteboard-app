import { useState } from "react";
import type { IconType } from "react-icons";
import {
  LuGrid2X2,
  LuSquareDashedMousePointer,
  LuAlignVerticalJustifyCenter,
  LuAlignVerticalJustifyEnd,
  LuAlignVerticalJustifyStart,
  LuBold,
  LuItalic,
  LuUnderline,
} from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import {
  FONT_FAMILIES,
  VERTICAL_ALIGNS,
  type FontFamily,
  type VerticalAlign,
} from "../../../lib/elements/types";
import { FONT_SIZE_PRESETS, FONT_STACKS } from "../../../lib/text";
import { useBoardStore } from "../../../store/boardStoreContext";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { PanelSection } from "../../../ui/Panel/Panel";
import { AUTO_COLOR, ColorField } from "./ColorField";
import { useTextSwatches } from "./swatches";
import { selectSingleTable, selectTextScope, styleSelectors, textSelectors } from "./selectors";
import { getCellTextTarget, type TableTextScope } from "../../../store/boardStore";
import { OpacityField, OptionGroup, type Option } from "./StyleControls";
import { iconsFor } from "./iconsFor";
import { useStylePreview } from "./useStylePreview";
import { alignOptions } from "./alignOptions";
import type { Messages } from "../../../i18n/messages";
import { useMessages } from "../../../i18n/useMessages";
import { focusBoard, useBoardRoot } from "../boardRoot";
import { SHORTCUTS, formatShortcut } from "../shortcuts";


const FONT_ICONS = iconsFor(FONT_FAMILIES, (fontFamily) => (
  <span className={styles.fontSample} style={{ fontFamily: FONT_STACKS[fontFamily] }}>
    Aa
  </span>
));

const SIZE_ICONS: IconType[] = FONT_SIZE_PRESETS.map((_, i) => {
  function SizeBadge() {
    const messages = useMessages();
    return <span className={styles.sizeLabel}>{messages.text.sizeBadges[i]}</span>;
  }
  return SizeBadge;
});

const TABLE_SCOPE_ICONS: Record<TableTextScope, IconType> = {
  table: LuGrid2X2,
  cells: LuSquareDashedMousePointer,
};

const VERTICAL_ALIGN_ICONS: Record<VerticalAlign, IconType> = {
  top: LuAlignVerticalJustifyStart,
  middle: LuAlignVerticalJustifyCenter,
  bottom: LuAlignVerticalJustifyEnd,
};

function fontOptions(messages: Messages): Option<FontFamily>[] {
  return FONT_FAMILIES.map((value) => ({ value, label: messages.text.fonts[value], icon: FONT_ICONS[value] }));
}

function sizeOptions(messages: Messages): Option<number>[] {
  return FONT_SIZE_PRESETS.map((value, i) => ({ value, label: `${messages.text.sizes[i]} (${value})`, icon: SIZE_ICONS[i] }));
}

const TABLE_SCOPES: TableTextScope[] = ["table", "cells"];

function tableScopeOptions(messages: Messages): Option<TableTextScope>[] {
  return TABLE_SCOPES.map((value) => ({ value, label: messages.text.scopes[value], icon: TABLE_SCOPE_ICONS[value] }));
}

function verticalAlignOptions(messages: Messages): Option<VerticalAlign>[] {
  return VERTICAL_ALIGNS.map((value) => ({ value, label: messages.text.verticalAligns[value], icon: VERTICAL_ALIGN_ICONS[value] }));
}


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
  const rootRef = useBoardRoot();
  const [draft, setDraft] = useState<string | null>(null);
  const messages = useMessages();
  const shown = draft ?? (value === "mixed" ? "" : String(Math.round(value)));

  return (
    <input
      className={styles.sizeInput}
      type="number"
      min={MIN_FONT_SIZE}
      max={MAX_FONT_SIZE}
      value={shown}
      aria-label={messages.text.sizeInput}
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
        if (e.key === "Enter") focusBoard(rootRef);
      }}
    />
  );
}

export function TextControls() {
  const messages = useMessages();
  const textSwatches = useTextSwatches();
  const scope = useBoardStore(selectTextScope).split(",");
  const fontFamily = useBoardStore(textSelectors.fontFamily);
  const fontSize = useBoardStore(textSelectors.fontSize);
  const color = useBoardStore(textSelectors.color);
  const bold = useBoardStore(textSelectors.bold);
  const italic = useBoardStore(textSelectors.italic);
  const underline = useBoardStore(textSelectors.underline);
  const align = useBoardStore(textSelectors.align);
  const verticalAlign = useBoardStore(textSelectors.verticalAlign);
  const opacity = useBoardStore(styleSelectors.strokeOpacity);
  const setTextStyle = useBoardStore((s) => s.setTextStyle);
  const { preview, previewText, commit } = useStylePreview();

  const hasTable = useBoardStore((s) => selectSingleTable(s) !== null);
  const tableTextScope = useBoardStore((s) => s.tableTextScope);
  const setTableTextScope = useBoardStore((s) => s.setTableTextScope);
  const onCells = useBoardStore((s) => getCellTextTarget(s) !== null);

  const hasFree = scope.includes("free");
  const hasBox = scope.includes("box");
  const colorValue = color === null ? AUTO_COLOR : color;
  const toColor = (value: string) => (value === AUTO_COLOR ? null : value);

  return (
    <>
      {hasTable && (
        <PanelSection title={messages.text.scope}>
          <OptionGroup options={tableScopeOptions(messages)} value={tableTextScope} onChange={setTableTextScope} />
        </PanelSection>
      )}
      {!onCells && (
        <>
          <PanelSection title={messages.text.font}>
            <OptionGroup
              options={fontOptions(messages)}
              value={fontFamily}
              onChange={(value) => setTextStyle({ fontFamily: value })}
            />
          </PanelSection>
          <PanelSection title={messages.text.size}>
            <div className={styles.textRow}>
              <OptionGroup
                options={sizeOptions(messages)}
                value={fontSize}
                onChange={(value) => setTextStyle({ fontSize: value })}
              />
              <FontSizeInput value={fontSize} onPreview={(size) => previewText({ fontSize: size })} onCommit={commit} />
            </div>
          </PanelSection>
        </>
      )}
      <PanelSection title={messages.text.style}>
        <div className={styles.options}>
          <IconButton
            icon={LuBold}
            label={messages.shortcuts.bold}
            shortcut={formatShortcut(SHORTCUTS.bold.keys)}
            size="sm"
            tooltipSide="bottom"
            active={bold === true}
            onClick={() => setTextStyle({ bold: bold !== true })}
          />
          <IconButton
            icon={LuItalic}
            label={messages.shortcuts.italic}
            shortcut={formatShortcut(SHORTCUTS.italic.keys)}
            size="sm"
            tooltipSide="bottom"
            active={italic === true}
            onClick={() => setTextStyle({ italic: italic !== true })}
          />
          <IconButton
            icon={LuUnderline}
            label={messages.shortcuts.underline}
            shortcut={formatShortcut(SHORTCUTS.underline.keys)}
            size="sm"
            tooltipSide="bottom"
            active={underline === true}
            onClick={() => setTextStyle({ underline: underline !== true })}
          />
        </div>
      </PanelSection>
      <PanelSection title={messages.style.color}>
        <ColorField
          title={messages.text.color}
          value={colorValue}
          swatches={textSwatches}
          onChange={(value) => setTextStyle({ color: toColor(value) })}
          onPreview={(value) => previewText({ color: toColor(value) })}
          onPreviewEnd={commit}
        />
      </PanelSection>
      {(hasFree || hasBox) && (
        <PanelSection title={messages.text.align}>
          <div className={styles.textRow}>
            <OptionGroup options={alignOptions(messages)} value={align} onChange={(value) => setTextStyle({ align: value })} />
            {hasBox && (
              <OptionGroup
                options={verticalAlignOptions(messages)}
                value={verticalAlign}
                onChange={(value) => setTextStyle({ verticalAlign: value })}
              />
            )}
          </div>
        </PanelSection>
      )}
      {hasFree && (
        <PanelSection title={messages.style.opacity}>
          <OpacityField value={opacity} onPreview={(value) => preview({ strokeOpacity: value })} onCommit={commit} />
        </PanelSection>
      )}
    </>
  );
}
