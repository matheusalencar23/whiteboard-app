import { useEffect, useMemo, useRef, useState } from "react";
import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import styles from "./Canvas.module.scss";
import type { Point } from "../../../lib/types";
import type {
  BoardElement,
  BoxElementType,
  TextElement,
} from "../../../lib/elements/types";
import {
  containsBounds,
  containsPoint,
  getBounds,
  type Bounds,
} from "../../../lib/geometry/bounds";
import { distance } from "../../../lib/geometry/distance";
import {
  createBoxElement,
  getElementAtPoint,
  getElementBounds,
  resizeElement,
  translateElement,
} from "../../../lib/elements/registry";
import { createArrow, setArrowPoints } from "../../../lib/elements/shapes/arrow";
import { createFreedraw, setFreedrawPoints } from "../../../lib/elements/shapes/freedraw";
import { createText, setText } from "../../../lib/elements/shapes/text";
import {
  HANDLE_CURSORS,
  getHandleAt,
  getSelectionBounds,
  getSelectionFrame,
  resizeBounds,
  resizeElementsToBounds,
  type Handle,
} from "../../../lib/selection";
import { renderScene } from "../../../lib/render/renderScene";
import { screenToWorld } from "../../../lib/viewport";
import { FONT_FAMILY, LINE_HEIGHT } from "../../../lib/text";
import { useBoardStore } from "../../../store/boardStore";
import { TextEditor } from "../TextEditor/TextEditor";
import { isTypingTarget } from "../useShortcuts";

/** Sensibilidade do zoom por roda/pinça (maior = mais rápido). */
const ZOOM_SENSITIVITY = 0.005;
/** Teto do deltaY por evento, para a roda do mouse não dar saltos enormes. */
const MAX_WHEEL_DELTA = 50;
/** Folga para acertar um traço com o clique, em pixels de tela. */
const HIT_TOLERANCE = 6;
/** Distância mínima entre pontos do lápis, em pixels de tela. */
const FREEDRAW_MIN_DISTANCE = 1;

const BOX_TOOLS: readonly string[] = ["rectangle", "ellipse", "diamond"] satisfies BoxElementType[];

/** Interação em andamento, enquanto o botão do ponteiro está pressionado. */
type Interaction =
  | { kind: "panning"; last: Point }
  | { kind: "creating"; start: Point }
  | { kind: "freedrawing"; points: Point[] }
  | {
      kind: "moving";
      start: Point;
      originals: BoardElement[];
      /** `elements` no início, para registrar um passo no histórico. */
      before: BoardElement[];
    }
  | {
      kind: "resizing";
      handle: Handle;
      start: Point;
      bounds: Bounds;
      originals: BoardElement[];
      before: BoardElement[];
    }
  | { kind: "boxSelecting"; start: Point; initialSelection: string[] };

interface EditingText {
  element: TextElement;
  /** Ainda não está na store (acabou de ser criado com a ferramenta de texto). */
  isNew: boolean;
}

function getScreenPoint(e: { nativeEvent: MouseEvent }): Point {
  return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
}

function getSelectedElements(): BoardElement[] {
  const { elements, selectedIds } = useBoardStore.getState();
  const ids = new Set(selectedIds);
  return elements.filter((el) => ids.has(el.id));
}

/** Um elemento recém-arrastado tem tamanho suficiente para ser mantido? */
function hasSize(element: BoardElement): boolean {
  if (element.type === "arrow") return element.width > 0 || element.height > 0;
  return element.width > 0 && element.height > 0;
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roughRef = useRef<RoughCanvas | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const spacePressedRef = useRef(false);
  // O rascunho fica em ref e em state: o ref é lido nos handlers (sempre
  // atual), o state dispara o redesenho.
  const draftRef = useRef<BoardElement | null>(null);

  const elements = useBoardStore((s) => s.elements);
  const selectedIds = useBoardStore((s) => s.selectedIds);
  const viewport = useBoardStore((s) => s.viewport);
  const tool = useBoardStore((s) => s.tool);

  const [draft, setDraftState] = useState<BoardElement | null>(null);
  const [selectionBox, setSelectionBox] = useState<Bounds | null>(null);
  const [editing, setEditing] = useState<EditingText | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [hoverCursor, setHoverCursor] = useState("default");
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontsLoaded, setFontsLoaded] = useState(0);

  function setDraft(element: BoardElement | null) {
    draftRef.current = element;
    setDraftState(element);
  }

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

  // O canvas não espera a fonte carregar: desenha com a fonte reserva. Força
  // o carregamento da Caveat e redesenha quando ela chegar.
  useEffect(() => {
    document.fonts
      .load(`16px ${FONT_FAMILY}`)
      .then(() => setFontsLoaded((n) => n + 1))
      .catch(() => {});
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
      if (e.code !== "Space" || e.repeat || isTypingTarget(e.target)) return;
      e.preventDefault();
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

  // O texto em edição é mostrado pelo <textarea>, não pelo canvas.
  const scene = useMemo(() => {
    const visible = editing ? elements.filter((el) => el.id !== editing.element.id) : elements;
    return draft ? [...visible, draft] : visible;
  }, [elements, draft, editing]);

  const selected = useMemo(() => {
    const ids = new Set(selectedIds);
    return elements.filter((el) => ids.has(el.id));
  }, [elements, selectedIds]);

  // Redesenha a cena sempre que algo visível muda.
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

    renderScene(
      ctx,
      rc,
      scene,
      { selected, selectionBox, showHandles: !isInteracting },
      viewport,
      dpr,
    );
  }, [scene, selected, selectionBox, isInteracting, viewport, size, fontsLoaded]);

  function startEditingText(element: TextElement, isNew: boolean) {
    useBoardStore.getState().setSelection([]);
    setEditing({ element, isNew });
  }

  function finishEditingText(text: string) {
    const current = editing;
    setEditing(null);
    if (!current) return;

    const store = useBoardStore.getState();
    const isEmpty = text.trim() === "";
    const updated = setText(current.element, text);

    if (current.isNew) {
      if (!isEmpty) store.addElement(updated, { select: true });
    } else if (isEmpty) {
      store.deleteElements([current.element.id]);
    } else {
      if (text !== current.element.text) store.replaceElement(updated);
      store.setSelection([current.element.id]);
    }
    store.setTool("selection");
  }

  /** Clique com a ferramenta de seleção: alça, elemento ou área vazia. */
  function startSelectionInteraction(world: Point, shiftKey: boolean) {
    const store = useBoardStore.getState();
    const { zoom } = store.viewport;
    const tolerance = HIT_TOLERANCE / zoom;
    const selectedNow = getSelectedElements();
    const bounds = getSelectionBounds(selectedNow);

    // 1. Alça de redimensionamento da seleção atual.
    const handle = bounds && getHandleAt(world, bounds, zoom);
    if (bounds && handle) {
      interactionRef.current = {
        kind: "resizing",
        handle,
        start: world,
        bounds,
        originals: selectedNow,
        before: store.elements,
      };
      return;
    }

    // 2. Um elemento sob o cursor.
    const hit = getElementAtPoint(store.elements, world, tolerance);
    if (hit) {
      const isSelected = store.selectedIds.includes(hit.id);
      if (shiftKey) {
        // Shift alterna o elemento na seleção, sem arrastar se ele saiu.
        if (isSelected) {
          store.setSelection(store.selectedIds.filter((id) => id !== hit.id));
          return;
        }
        store.setSelection([...store.selectedIds, hit.id]);
      } else if (!isSelected) {
        store.setSelection([hit.id]);
      }
      interactionRef.current = {
        kind: "moving",
        start: world,
        originals: getSelectedElements(),
        before: store.elements,
      };
      return;
    }

    // 3. Área vazia dentro da caixa da seleção: arrasta a seleção inteira.
    // Isso permite mover formas sem preenchimento clicando no meio delas.
    if (!shiftKey && bounds && containsPoint(getSelectionFrame(bounds, zoom), world)) {
      interactionRef.current = {
        kind: "moving",
        start: world,
        originals: selectedNow,
        before: store.elements,
      };
      return;
    }

    // 4. Área vazia: seleção por caixa.
    const initialSelection = shiftKey ? store.selectedIds : [];
    if (!shiftKey) store.setSelection([]);
    interactionRef.current = { kind: "boxSelecting", start: world, initialSelection };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    // Clicar fora do texto em edição só confirma a edição.
    if (editing) {
      (document.activeElement as HTMLElement | null)?.blur();
      return;
    }

    const store = useBoardStore.getState();
    const screen = getScreenPoint(e);
    const wantsPan =
      e.button === 1 || (e.button === 0 && (store.tool === "hand" || spacePressedRef.current));

    if (!wantsPan && e.button !== 0) return;
    e.preventDefault();

    const world = screenToWorld(screen, store.viewport);

    if (!wantsPan && store.tool === "text") {
      startEditingText(createText(world), true);
      return;
    }

    // Continua recebendo os eventos mesmo se o ponteiro sair do canvas.
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsInteracting(true);

    if (wantsPan) {
      interactionRef.current = { kind: "panning", last: screen };
      setIsPanning(true);
    } else if (store.tool === "selection") {
      startSelectionInteraction(world, e.shiftKey);
    } else if (store.tool === "freedraw") {
      interactionRef.current = { kind: "freedrawing", points: [world] };
      setDraft(createFreedraw([world]));
    } else if (store.tool === "arrow") {
      interactionRef.current = { kind: "creating", start: world };
      setDraft(createArrow(world, world));
    } else if (BOX_TOOLS.includes(store.tool)) {
      interactionRef.current = { kind: "creating", start: world };
      setDraft(createBoxElement(store.tool as BoxElementType, world, world));
    }
  }

  /** Cursor da ferramenta de seleção conforme o que está sob o ponteiro. */
  function updateHoverCursor(world: Point) {
    const store = useBoardStore.getState();
    const { zoom } = store.viewport;
    const bounds = getSelectionBounds(getSelectedElements());

    const handle = bounds && getHandleAt(world, bounds, zoom);
    if (handle) return setHoverCursor(HANDLE_CURSORS[handle]);

    const overSelection = bounds && containsPoint(getSelectionFrame(bounds, zoom), world);
    const overElement = getElementAtPoint(store.elements, world, HIT_TOLERANCE / zoom);
    setHoverCursor(overSelection || overElement ? "move" : "default");
  }

  function handlePointerMove(e: React.PointerEvent) {
    const store = useBoardStore.getState();
    const screen = getScreenPoint(e);
    const world = screenToWorld(screen, store.viewport);
    const interaction = interactionRef.current;

    if (!interaction) {
      if (store.tool === "selection" && !editing) updateHoverCursor(world);
      return;
    }

    switch (interaction.kind) {
      case "panning":
        store.panBy(screen.x - interaction.last.x, screen.y - interaction.last.y);
        interaction.last = screen;
        break;

      case "creating": {
        const current = draftRef.current;
        if (!current) break;
        setDraft(
          current.type === "arrow"
            ? setArrowPoints(current, [interaction.start, world])
            : resizeElement(current, getBounds([interaction.start, world])),
        );
        break;
      }

      case "freedrawing": {
        const current = draftRef.current;
        const last = interaction.points[interaction.points.length - 1];
        if (current?.type !== "freedraw") break;
        if (distance(last, world) < FREEDRAW_MIN_DISTANCE / store.viewport.zoom) break;
        interaction.points.push(world);
        setDraft(setFreedrawPoints(current, interaction.points));
        break;
      }

      case "moving": {
        const dx = world.x - interaction.start.x;
        const dy = world.y - interaction.start.y;
        store.updateElements(interaction.originals.map((el) => translateElement(el, dx, dy)));
        break;
      }

      case "resizing": {
        const next = resizeBounds(
          interaction.bounds,
          interaction.handle,
          world.x - interaction.start.x,
          world.y - interaction.start.y,
        );
        store.updateElements(resizeElementsToBounds(interaction.originals, interaction.bounds, next));
        break;
      }

      case "boxSelecting": {
        const box = getBounds([interaction.start, world]);
        setSelectionBox(box);
        const inside = store.elements
          .filter((el) => containsBounds(box, getElementBounds(el)))
          .map((el) => el.id);
        store.setSelection([...new Set([...interaction.initialSelection, ...inside])]);
        break;
      }
    }
  }

  function endInteraction() {
    interactionRef.current = null;
    setDraft(null);
    setSelectionBox(null);
    setIsInteracting(false);
    setIsPanning(false);
  }

  function handlePointerUp() {
    const interaction = interactionRef.current;
    const draftElement = draftRef.current;
    const store = useBoardStore.getState();
    endInteraction();
    if (!interaction) return;

    switch (interaction.kind) {
      case "creating":
        // Um clique sem arrastar não cria um elemento vazio.
        if (draftElement && hasSize(draftElement)) {
          store.addElement(draftElement, { select: true });
          store.setTool("selection");
        }
        break;

      case "freedrawing":
        // O lápis continua ativo para o próximo traço.
        if (draftElement) store.addElement(draftElement);
        break;

      case "moving":
      case "resizing":
        store.commitHistory(interaction.before);
        break;
    }
  }

  function handlePointerCancel() {
    const interaction = interactionRef.current;
    // Desfaz o que estava sendo arrastado, sem criar passo no histórico.
    if (interaction?.kind === "moving" || interaction?.kind === "resizing") {
      useBoardStore.getState().updateElements(interaction.originals);
    }
    endInteraction();
  }

  /** Duplo clique: edita um texto existente ou cria um texto novo ali. */
  function handleDoubleClick(e: React.MouseEvent) {
    const store = useBoardStore.getState();
    if (store.tool !== "selection" || editing) return;

    const world = screenToWorld(getScreenPoint(e), store.viewport);
    const hit = getElementAtPoint(store.elements, world, HIT_TOLERANCE / store.viewport.zoom);

    if (hit?.type === "text") {
      startEditingText(hit, false);
    } else if (!hit) {
      // Centraliza a primeira linha no ponto clicado.
      const text = createText(world);
      startEditingText({ ...text, y: world.y - (text.fontSize * LINE_HEIGHT) / 2 }, true);
    }
  }

  let cursor: string;
  if (isPanning) cursor = "grabbing";
  else if (tool === "hand" || spacePressed) cursor = "grab";
  else if (tool === "selection") cursor = hoverCursor;
  else if (tool === "text") cursor = "text";
  else cursor = "crosshair";

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onDoubleClick={handleDoubleClick}
      />
      {editing && (
        <TextEditor
          key={editing.element.id}
          element={editing.element}
          viewport={viewport}
          onSubmit={finishEditingText}
        />
      )}
    </>
  );
}
