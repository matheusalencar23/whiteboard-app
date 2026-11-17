import { useMemo } from "react";
import type { BoardElement } from "../../lib/elements/types";
import { getExportBounds, renderToCanvas } from "../../lib/export/exportScene";
import type { ColorScheme } from "../../lib/theme";
import { useColorScheme } from "../useColorScheme";
import styles from "./Home.module.scss";

interface BoardPreviewProps {
  elements: BoardElement[];
}

const PREVIEW_WIDTH = 280;
const PREVIEW_HEIGHT = 170;

function renderPreview(elements: BoardElement[], scheme: ColorScheme): string | null {
  const bounds = getExportBounds(elements);
  if (!bounds) return null;
  const fit = Math.min(PREVIEW_WIDTH / bounds.width, PREVIEW_HEIGHT / bounds.height, 1);
  return renderToCanvas(elements, { background: false, scheme, scale: fit * window.devicePixelRatio })?.toDataURL() ?? null;
}

export function BoardPreview({ elements }: BoardPreviewProps) {
  const scheme = useColorScheme();
  const src = useMemo(() => renderPreview(elements, scheme), [elements, scheme]);

  return (
    <div className={styles.preview}>
      {src ? (
        <img src={src} alt="" className={styles.previewImage} />
      ) : (
        <span className={styles.previewEmpty}>Vazio</span>
      )}
    </div>
  );
}
