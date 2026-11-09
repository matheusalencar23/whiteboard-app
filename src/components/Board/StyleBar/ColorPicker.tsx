import { useState } from "react";
import { CustomPicker, type ColorChangeHandler, type InjectedColorProps } from "react-color";
import { Hue, Saturation } from "react-color/lib/components/common";
import styles from "./ColorPicker.module.scss";

const HEX_PATTERN = /^#?([0-9a-f]{6})$/i;

function parseHex(value: string): string | null {
  const match = HEX_PATTERN.exec(value.trim());
  return match ? `#${match[1].toLowerCase()}` : null;
}

function HexInput({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && parseHex(draft) === null;

  return (
    <label className={styles.hex}>
      <span>Hex</span>
      <input
        value={draft ?? value}
        spellCheck={false}
        maxLength={7}
        aria-invalid={invalid}
        onChange={(e) => {
          setDraft(e.target.value);
          const hex = parseHex(e.target.value);
          if (hex) onChange(hex);
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  );
}

function PickerBody(props: InjectedColorProps) {
  const { hex = "#000000", onChange } = props;
  return (
    <div className={styles.picker}>
      <div className={styles.saturation}>
        <Saturation {...props} onChange={(color) => onChange?.(color)} />
      </div>
      <div className={styles.hue}>
        <Hue {...props} direction="horizontal" onChange={(color) => onChange?.(color)} />
      </div>
      <HexInput value={hex} onChange={(value) => onChange?.(value)} />
    </div>
  );
}

const WrappedPicker = CustomPicker(PickerBody);

interface ColorPickerProps {
  color: string | undefined;
  onChange: ColorChangeHandler;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  return <WrappedPicker color={color} onChange={onChange} />;
}
