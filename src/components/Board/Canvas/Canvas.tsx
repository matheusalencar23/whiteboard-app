import { useEffect, useMemo, useRef, useState } from "react";
import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import styles from "./Canvas.module.scss";
import type { Point } from "../../../lib/types";
import type { RectangleElement } from "../../../lib/elements/types";
import {
  createRectangle,
  resizeRectangle,
} from "../../../lib/elements/shapes/rectangle";
import { renderScene } from "../../../lib/render/renderScene";
import { screenToWorld } from "../../../lib/viewport";
import { useBoardStore } from "../../../store/boardStore";

/** Sensibilidade do zoom por roda/pinça (maior = mais rápido). */
const ZOOM_SENSITIVITY = 0.005;
/** Teto do deltaY por evento, para a roda do mouse não dar saltos enormes. */
const MAX_WHEEL_DELTA = 50;

/** Interação em andamento, enquanto o botão do ponteiro está pressionado. */
type Interaction =
  | { kind: "drawing"; start: Point }
  | { kind: "panning"; last: Point };

function getScreenPoint(e: { nativeEvent: MouseEvent }): Point {
  return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roughRef = useRef<RoughCanvas | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const spacePressedRef = useRef(false);

  const elements = useBoardStore((s) => s.elements);
  const viewport = useBoardStore((s) => s.viewport);
  const tool = useBoardStore((s) => s.tool);
  const addElement = useBoardStore((s) => s.addElement);
  const panBy = useBoardStore((s) => s.panBy);

  const [draft, setDraft] = useState<RectangleElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Acompanha o tamanho do canvas na tela (ele ocupa todo o board).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    roughRef.current = rough.canvas(canvas);

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  // Roda do mouse: rola a câmera; com Ctrl/Cmd (ou pinça no trackpad), dá zoom.
  // Listener nativo porque o onWheel do React é passivo e não deixa chamar
  // preventDefault (que impede o zoom da página inteira).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const { panBy, zoomAt } = useBoardStore.getState();
      // deltaMode 1 = linhas (Firefox); converte para pixels.
      const scale = e.deltaMode === 1 ? 16 : 1;
      const dx = e.deltaX * scale;
      const dy = e.deltaY * scale;

      if (e.ctrlKey || e.metaKey) {
        const delta = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, dy));
        zoomAt({ x: e.offsetX, y: e.offsetY }, Math.exp(-delta * ZOOM_SENSITIVITY));
      } else if (e.shiftKey) {
        panBy(-dy, -dx);
      } else {
        panBy(-dx, -dy);
      }
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  // Espaço segurado = mover a câmera arrastando, como no Excalidraw/Figma.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat) return;
      spacePressedRef.current = true;
      setSpacePressed(true);
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      spacePressedRef.current = false;
      setSpacePressed(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const scene = useMemo(
    () => (draft ? [...elements, draft] : elements),
    [elements, draft],
  );

  // Redesenha a cena sempre que elementos, rascunho, câmera ou tamanho mudam.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const rc = roughRef.current;
    if (!canvas || !ctx || !rc) return;

    // Resolução real em pixels do dispositivo, para não ficar borrado em telas HiDPI.
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(size.width * dpr);
    const pixelHeight = Math.round(size.height * dpr);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

    renderScene(ctx, rc, scene, viewport, dpr);
  }, [scene, viewport, size]);

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const screen = getScreenPoint(e);
    const wantsPan =
      e.button === 1 ||
      (e.button === 0 && (tool === "hand" || spacePressedRef.current));

    if (wantsPan) {
      e.preventDefault();
    } else if (e.button !== 0) {
      return;
    }

    // Continua recebendo os eventos mesmo se o ponteiro sair do canvas.
    e.currentTarget.setPointerCapture(e.pointerId);

    if (wantsPan) {
      interactionRef.current = { kind: "panning", last: screen };
      setIsPanning(true);
      return;
    }

    const start = screenToWorld(screen, viewport);
    interactionRef.current = { kind: "drawing", start };
    setDraft(createRectangle(start, start));
  }

  function handlePointerMove(e: React.PointerEvent) {
    const interaction = interactionRef.current;
    if (!interaction) return;

    const screen = getScreenPoint(e);

    if (interaction.kind === "panning") {
      panBy(screen.x - interaction.last.x, screen.y - interaction.last.y);
      interactionRef.current = { kind: "panning", last: screen };
      return;
    }

    const end = screenToWorld(screen, viewport);
    setDraft((current) => current && resizeRectangle(current, interaction.start, end));
  }

  function handlePointerUp() {
    const interaction = interactionRef.current;
    interactionRef.current = null;
    setIsPanning(false);

    // Um clique sem arrastar não cria um retângulo vazio.
    if (interaction?.kind === "drawing" && draft && draft.width > 0 && draft.height > 0) {
      addElement(draft);
    }
    setDraft(null);
  }

  function handlePointerCancel() {
    interactionRef.current = null;
    setIsPanning(false);
    setDraft(null);
  }

  const cursor = isPanning
    ? "grabbing"
    : tool === "hand" || spacePressed
      ? "grab"
      : "crosshair";

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      style={{ cursor }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    />
  );
}
