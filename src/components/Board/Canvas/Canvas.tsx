import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import styles from "./Canvas.module.scss";
import type { Point } from "../../../lib/types";
import { getBounds } from "../../../lib/geometry/bounds";
import {
  drawRectangle,
  rectanglePoints,
  type Rectangle,
} from "../../../lib/geometry/shapes/rectangle";

function getPointerPosition(e: React.PointerEvent): Point {
  return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startPointRef = useRef<Point | null>(null);

  const [elements, setElements] = useState<Rectangle[]>([]);
  const [draft, setDraft] = useState<Rectangle | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Acompanha o tamanho do canvas na tela (ele ocupa todo o board).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  // Redesenha tudo: elementos confirmados + o retângulo sendo arrastado.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Resolução real em pixels do dispositivo, para não ficar borrado em telas HiDPI.
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(size.width * dpr);
    const pixelHeight = Math.round(size.height * dpr);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    elements.forEach((el) => drawRectangle(el, ctx));
    if (draft) drawRectangle(draft, ctx);
  }, [elements, draft, size]);

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0) return;

    // Continua recebendo os eventos mesmo se o ponteiro sair do canvas.
    e.currentTarget.setPointerCapture(e.pointerId);

    const start = getPointerPosition(e);
    startPointRef.current = start;
    setDraft({ id: nanoid(), points: rectanglePoints(start, start) });
  }

  function handlePointerMove(e: React.PointerEvent) {
    const start = startPointRef.current;
    if (!start) return;

    const points = rectanglePoints(start, getPointerPosition(e));
    setDraft((current) => current && { ...current, points });
  }

  function handlePointerUp() {
    startPointRef.current = null;

    if (draft) {
      const { width, height } = getBounds(draft.points);
      // Um clique sem arrastar não cria um retângulo vazio.
      if (width > 0 && height > 0) {
        setElements((current) => [...current, draft]);
      }
    }
    setDraft(null);
  }

  function handlePointerCancel() {
    startPointRef.current = null;
    setDraft(null);
  }

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    />
  );
}
