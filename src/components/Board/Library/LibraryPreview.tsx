import { useEffect, useRef } from "react";
import rough from "roughjs";
import { getCenter, unionBounds } from "../../../lib/geometry/bounds";
import { createLibraryElements, type LibraryItem } from "../../../lib/elements/library";
import { getElementBounds, renderElement } from "../../../lib/elements/registry";
import { DEFAULT_STYLE, DEFAULT_TEXT_STYLE } from "../../../lib/elements/types";
import styles from "./LibraryPanel.module.scss";

const PREVIEW_WIDTH = 64;
const PREVIEW_HEIGHT = 44;
const PREVIEW_PADDING = 6;
const MAX_SCALE = 0.32;
const PREVIEW_STROKE = 1.25;
const PREVIEW_SEED = 7;

interface LibraryPreviewProps {
  item: LibraryItem;
  fontsVersion: number;
}

export function LibraryPreview({ item, fontsVersion }: LibraryPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const fitScale = Math.min(
      (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / item.width,
      (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / item.height,
      MAX_SCALE,
    );
    const style = { ...DEFAULT_STYLE, strokeWidth: PREVIEW_STROKE / fitScale, strokeRoughness: 0.6 };
    const bounds = { x: 0, y: 0, width: item.width, height: item.height };
    const elements = createLibraryElements(item, bounds, style, DEFAULT_TEXT_STYLE);
    const drawn = unionBounds(elements.map(getElementBounds));
    const scale = Math.min(
      fitScale,
      (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / drawn.width,
      (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / drawn.height,
    );
    const center = getCenter(drawn);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(PREVIEW_WIDTH * dpr);
    canvas.height = Math.round(PREVIEW_HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    ctx.translate(PREVIEW_WIDTH / 2, PREVIEW_HEIGHT / 2);
    ctx.scale(scale, scale);
    ctx.translate(-center.x, -center.y);

    const rc = rough.canvas(canvas);
    for (const element of elements) renderElement({ ...element, seed: PREVIEW_SEED }, rc, ctx);
  }, [item, fontsVersion]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.preview}
      style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
      aria-hidden
    />
  );
}
