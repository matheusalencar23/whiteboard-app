import { useMemo, useState } from "react";
import { LuCopy, LuDownload } from "react-icons/lu";
import styles from "./Export.module.scss";
import { Modal } from "../../../ui/Modal/Modal";
import { Button } from "../../../ui/Button/Button";
import { useBoardStore } from "../../../store/boardStoreContext";
import type { WhiteboardConfig } from "../../../store/whiteboardConfig";
import { getExportBounds, getPngSize, renderToCanvas, type ExportOptions } from "../../../lib/export/exportScene";
import { canCopyImage, copyPng, downloadPng, downloadSvg } from "./exportActions";

interface ExportDialogProps {
  onClose: () => void;
}

type Scope = "all" | "selection";

type Background = "light" | "dark" | "transparent";

function backgroundOptions(background: Background, themes: WhiteboardConfig["themes"]): Omit<ExportOptions, "scale"> {
  const scheme = background === "dark" ? "dark" : "light";
  return { background: background !== "transparent", scheme, backgroundColor: themes[scheme].canvas.exportBackground };
}

const SCALES = [1, 2, 3] as const;

const PREVIEW_WIDTH = 560;
const PREVIEW_HEIGHT = 260;

interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}

function Segmented<T extends string | number>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.segmented} role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={styles.segment}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const allElements = useBoardStore((s) => s.elements);
  const selectedIds = useBoardStore((s) => s.selectedIds);
  const name = useBoardStore((s) => s.name);
  const themes = useBoardStore((s) => s.config.themes);
  const hasSelection = selectedIds.length > 0;

  const [scope, setScope] = useState<Scope>(hasSelection ? "selection" : "all");
  const [background, setBackground] = useState<Background>("light");
  const [scale, setScale] = useState<number>(2);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ message: string; error: boolean } | null>(null);

  const elements = useMemo(() => {
    if (scope === "all" || !hasSelection) return allElements;
    const ids = new Set(selectedIds);
    return allElements.filter((el) => ids.has(el.id));
  }, [allElements, selectedIds, scope, hasSelection]);

  const options: ExportOptions = { ...backgroundOptions(background, themes), scale };
  const bounds = getExportBounds(elements);
  const pngSize = bounds ? getPngSize(bounds, scale) : null;

  const preview = useMemo(() => {
    const exportBounds = getExportBounds(elements);
    if (!exportBounds) return null;
    const fit = Math.min(PREVIEW_WIDTH / exportBounds.width, PREVIEW_HEIGHT / exportBounds.height, 2);
    const previewOptions = { ...backgroundOptions(background, themes), scale: fit * window.devicePixelRatio };
    return renderToCanvas(elements, previewOptions)?.toDataURL() ?? null;
  }, [elements, background, themes]);

  async function run(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      if (success) setStatus({ message: success, error: false });
    } catch (error) {
      console.warn("Falha ao exportar.", error);
      setStatus({ message: "Não foi possível exportar a imagem.", error: true });
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || elements.length === 0;

  return (
    <Modal title="Exportar imagem" onClose={onClose} className={styles.dialog}>
      <div className={styles.content}>
        <div className={styles.preview} data-transparent={background === "transparent"}>
          {preview ? (
            <img src={preview} alt="Prévia da imagem exportada" className={styles.previewImage} />
          ) : (
            <span className={styles.empty}>Nada para exportar.</span>
          )}
        </div>

        <div className={styles.fields}>
          <Segmented<Scope>
            label="Conteúdo"
            value={hasSelection ? scope : "all"}
            options={[
              { value: "all", label: "Board inteiro" },
              { value: "selection", label: "Só a seleção", disabled: !hasSelection },
            ]}
            onChange={setScope}
          />
          <Segmented<Background>
            label="Fundo"
            value={background}
            options={[
              { value: "light", label: "Branco" },
              { value: "dark", label: "Escuro" },
              { value: "transparent", label: "Transparente" },
            ]}
            onChange={setBackground}
          />
          <Segmented<number>
            label="Escala do PNG"
            value={scale}
            options={SCALES.map((value) => ({ value, label: `${value}×` }))}
            onChange={setScale}
          />
        </div>

        <footer className={styles.footer}>
          <span className={status?.error ? styles.error : styles.info} role="status">
            {status?.message ?? (pngSize ? `PNG de ${pngSize.width} × ${pngSize.height} px` : "")}
          </span>
          <div className={styles.actions}>
            {canCopyImage() && (
              <Button icon={LuCopy} disabled={disabled} onClick={() => run(() => copyPng(elements, options), "PNG copiado.")}>
                Copiar PNG
              </Button>
            )}
            <Button icon={LuDownload} disabled={disabled} onClick={() => run(() => downloadSvg(elements, options, name))}>
              SVG
            </Button>
            <Button
              icon={LuDownload}
              variant="primary"
              disabled={disabled}
              onClick={() => run(() => downloadPng(elements, options, name))}
            >
              PNG
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
