import { useEffect, useMemo, useRef, useState } from "react";
import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import styles from "./Canvas.module.scss";
import type { Point } from "../../../lib/types";
import type {
  ArrowBinding,
  ArrowElement,
  BoardElement,
  BoxElement,
  BoxElementType,
  TextElement,
} from "../../../lib/elements/types";
import { isBoxElement } from "../../../lib/elements/types";
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
  getLabelArea,
  getLabelTargetAt,
  getElementBounds,
  resizeElement,
  translateElement,
} from "../../../lib/elements/registry";
import { createArrow, getArrowPoints, setArrowPoints } from "../../../lib/elements/shapes/arrow";
import {
  findBinding,
  getBinding,
  moveElbowSegment,
  isSegmentFixed,
  releaseElbowSegment,
  removeArrowPoint,
  refreshArrow,
  releaseBindings,
  sameBinding,
  setBinding,
  type ArrowEnd,
} from "../../../lib/elements/bindings";
import { createFreedraw, setFreedrawPoints } from "../../../lib/elements/shapes/freedraw";
import { createText, setText } from "../../../lib/elements/shapes/text";
import {
  HANDLE_CURSORS,
  getArrowHandleAt,
  getHandleAt,
  getSingleArrow,
  getSelectionBounds,
  getSelectionFrame,
  resizeBounds,
  resizeElementsToBounds,
  type Handle,
} from "../../../lib/selection";
import { renderScene } from "../../../lib/render/renderScene";
import { GRID_SIZE } from "../../../lib/render/grid";
import { screenToWorld } from "../../../lib/viewport";
import { FONT_FAMILY, LABEL_FONT_SIZE, LINE_HEIGHT } from "../../../lib/text";
import { useBoardStore } from "../../../store/boardStore";
import { TextEditor, type TextEditorLayout } from "../TextEditor/TextEditor";
import { isTypingTarget } from "../useShortcuts";

/** Sensibilidade do zoom por roda/pinça (maior = mais rápido). */
const ZOOM_SENSITIVITY = 0.005;
/** Teto do deltaY por evento, para a roda do mouse não dar saltos enormes. */
const MAX_WHEEL_DELTA = 50;
/** Folga para acertar um traço com o clique, em pixels de tela. */
const HIT_TOLERANCE = 6;
/** Distância mínima entre pontos do lápis, em pixels de tela. */
const FREEDRAW_MIN_DISTANCE = 1;
/** Folga em volta da forma para a ponta da seta se ligar, em pixels de tela. */
const BINDING_TOLERANCE = 8;
/** Distância para a ponta encaixar num ponto de conexão, em pixels de tela. */
const CONNECTION_SNAP_DISTANCE = 12;

const BOX_TOOLS: readonly string[] = ["rectangle", "ellipse", "diamond"] satisfies BoxElementType[];

/** Interação em andamento, enquanto o botão do ponteiro está pressionado. */
type Interaction =
  | { kind: "panning"; last: Point }
  | {
      kind: "creating";
      start: Point;
      /** Seta: ligação da primeira ponta. */
      startBinding: ArrowBinding | null;
    }
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
  | {
      kind: "draggingPoint";
      /** Seta de base, já com o ponto novo quando o arraste começou numa alça do meio. */
      arrow: ArrowElement;
      /** Índice do ponto arrastado em `arrow.points`. */
      index: number;
      /** Seta como estava na store, para cancelar. */
      original: ArrowElement;
      before: BoardElement[];
    }
  | {
      kind: "draggingSegment";
      /** Seta ortogonal como estava no início (também usada para cancelar). */
      original: ArrowElement;
      index: number;
      before: BoardElement[];
    }
  | {
      kind: "draggingEndpoint";
      end: ArrowEnd;
      original: ArrowElement;
      before: BoardElement[];
    }
  | { kind: "boxSelecting"; start: Point; initialSelection: string[] };

/** Texto em edição: um texto solto ou o rótulo de uma forma. */
type Editing =
  | {
      kind: "text";
      element: TextElement;
      /** Ainda não está na store (acabou de ser criado com a ferramenta de texto). */
      isNew: boolean;
    }
  | { kind: "label"; element: BoxElement };

function getScreenPoint(e: { nativeEvent: MouseEvent }): Point {
  return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
}

function getSelectedElements(): BoardElement[] {
  const { elements, selectedIds } = useBoardStore.getState();
  const ids = new Set(selectedIds);
  return elements.filter((el) => ids.has(el.id));
}

/** Ligação que uma ponta de seta em `world` faria (flutuante ou num ponto de conexão). */
function findBindingAt(world: Point, excludeIds: (string | null | undefined)[] = []) {
  const { elements, viewport } = useBoardStore.getState();
  const { zoom } = viewport;
  return findBinding(
    elements,
    world,
    BINDING_TOLERANCE / zoom,
    CONNECTION_SNAP_DISTANCE / zoom,
    excludeIds,
  );
}

/** Desliga das formas as setas movidas ou redimensionadas sem elas. */
function detachFromStaying(moved: BoardElement[]): BoardElement[] {
  return releaseBindings(moved, new Set(moved.map((el) => el.id)));
}

/** Onde o `<textarea>` abre: no texto solto ou centralizado na forma. */
function editorLayout(editing: Editing): TextEditorLayout {
  if (editing.kind === "text") return { kind: "free", position: editing.element };
  const area = getLabelArea(editing.element) ?? editing.element;
  return { kind: "label", area };
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
  const showGrid = useBoardStore((s) => s.showGrid);
  const tool = useBoardStore((s) => s.tool);

  const [draft, setDraftState] = useState<BoardElement | null>(null);
  const [selectionBox, setSelectionBox] = useState<Bounds | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [hoverCursor, setHoverCursor] = useState("default");
  // Ligação que a ponta da seta faria agora: a forma fica destacada, com os
  // pontos de conexão, e o ponto escolhido em evidência.
  const [bindingHint, setBindingHintState] = useState<ArrowBinding | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontsLoaded, setFontsLoaded] = useState(0);

  /** Evita re-renderizar a cada movimento do mouse quando a dica não mudou. */
  function setBindingHint(next: ArrowBinding | null) {
    setBindingHintState((current) => (sameBinding(current, next) ? current : next));
  }

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

  // O texto em edição é mostrado pelo <textarea>, não pelo canvas. No
  // rótulo, só o texto some: a forma continua desenhada.
  const scene = useMemo(() => {
    let visible = elements;
    if (editing?.kind === "text") {
      visible = elements.filter((el) => el.id !== editing.element.id);
    } else if (editing?.kind === "label") {
      visible = elements.map((el) => (el.id === editing.element.id ? { ...el, label: undefined } : el));
    }
    return draft ? [...visible, draft] : visible;
  }, [elements, draft, editing]);

  const selected = useMemo(() => {
    const ids = new Set(selectedIds);
    return elements.filter((el) => ids.has(el.id));
  }, [elements, selectedIds]);

  // O destaque só vale com a ferramenta de seta ou arrastando uma ponta.
  const showBindingTarget = tool === "arrow" || isInteracting;
  const bindingTarget = useMemo(
    () =>
      (showBindingTarget && bindingHint && elements.find((el) => el.id === bindingHint.elementId)) ||
      null,
    [elements, bindingHint, showBindingTarget],
  );

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
      {
        selected,
        selectionBox,
        showHandles: !isInteracting,
        bindingTarget,
        bindingAnchor: bindingHint?.anchor ?? null,
      },
      viewport,
      dpr,
      showGrid ? GRID_SIZE : null,
    );
  }, [
    scene,
    selected,
    selectionBox,
    showGrid,
    isInteracting,
    bindingTarget,
    bindingHint,
    viewport,
    size,
    fontsLoaded,
  ]);

  function startEditingText(element: TextElement, isNew: boolean) {
    useBoardStore.getState().setSelection([]);
    setEditing({ kind: "text", element, isNew });
  }

  function startEditingLabel(element: BoxElement) {
    useBoardStore.getState().setSelection([]);
    setEditing({ kind: "label", element });
  }

  function finishEditing(text: string) {
    const current = editing;
    setEditing(null);
    if (!current) return;
    if (current.kind === "label") finishEditingLabel(current.element.id, text);
    else finishEditingText(current, text);
  }

  /** Texto vazio remove o rótulo. A forma fica selecionada no fim. */
  function finishEditingLabel(id: string, text: string) {
    const store = useBoardStore.getState();
    const shape = store.elements.find((el) => el.id === id);
    if (shape && isBoxElement(shape)) {
      const isEmpty = text.trim() === "";
      if (isEmpty && shape.label) {
        store.replaceElement({ ...shape, label: undefined });
      } else if (!isEmpty && text !== shape.label?.text) {
        const fontSize = shape.label?.fontSize ?? LABEL_FONT_SIZE;
        store.replaceElement({ ...shape, label: { text, fontSize } });
      }
      store.setSelection([id]);
    }
    store.setTool("selection");
  }

  function finishEditingText(current: Extract<Editing, { kind: "text" }>, text: string) {
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
    const singleArrow = getSingleArrow(selectedNow);

    // 1a. Alça de uma seta selecionada sozinha: ponta, ponto do meio ou
    // alça do meio de um trecho (que cria um ponto ali).
    const arrowHandle = singleArrow && getArrowHandleAt(singleArrow, world, zoom);
    if (singleArrow && arrowHandle) {
      if (arrowHandle.kind === "end") {
        interactionRef.current = {
          kind: "draggingEndpoint",
          end: arrowHandle.end,
          original: singleArrow,
          before: store.elements,
        };
        return;
      }
      if (arrowHandle.kind === "segment") {
        interactionRef.current = {
          kind: "draggingSegment",
          original: singleArrow,
          index: arrowHandle.index,
          before: store.elements,
        };
        return;
      }
      let arrow = singleArrow;
      let index = arrowHandle.index;
      if (arrowHandle.kind === "midpoint") {
        const points = getArrowPoints(singleArrow);
        index = arrowHandle.index + 1;
        points.splice(index, 0, arrowHandle.position);
        arrow = setArrowPoints(singleArrow, points);
      }
      interactionRef.current = {
        kind: "draggingPoint",
        arrow,
        index,
        original: singleArrow,
        before: store.elements,
      };
      return;
    }

    // 1b. Alça de redimensionamento da seleção atual (a seta sozinha não tem).
    const handle = !singleArrow && bounds && getHandleAt(world, bounds, zoom);
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
      const startBinding = findBindingAt(world);
      interactionRef.current = { kind: "creating", start: world, startBinding };
      setDraft({ ...createArrow(world, world, store.arrowRouting), startBinding });
      setBindingHint(startBinding);
    } else if (BOX_TOOLS.includes(store.tool)) {
      interactionRef.current = { kind: "creating", start: world, startBinding: null };
      setDraft(createBoxElement(store.tool as BoxElementType, world, world));
    }
  }

  /** Cursor da ferramenta de seleção conforme o que está sob o ponteiro. */
  function updateHoverCursor(world: Point) {
    const store = useBoardStore.getState();
    const { zoom } = store.viewport;
    const selectedNow = getSelectedElements();
    const bounds = getSelectionBounds(selectedNow);
    const singleArrow = getSingleArrow(selectedNow);

    const arrowHandle = singleArrow && getArrowHandleAt(singleArrow, world, zoom);
    if (arrowHandle) {
      // Trecho da ortogonal: o cursor mostra para onde ele anda.
      if (arrowHandle.kind === "segment") {
        return setHoverCursor(arrowHandle.axis === "x" ? "ns-resize" : "ew-resize");
      }
      return setHoverCursor("pointer");
    }
    const handle = !singleArrow && bounds && getHandleAt(world, bounds, zoom);
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
      // Com a seta, destaca a forma em que ela começaria ligada.
      if (store.tool === "arrow") setBindingHint(findBindingAt(world));
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
        if (current.type !== "arrow") {
          setDraft(resizeElement(current, getBounds([interaction.start, world])));
          break;
        }
        // A ponta final não se liga à mesma forma da inicial.
        const binding = findBindingAt(world, [interaction.startBinding?.elementId]);
        const arrow = setBinding(setArrowPoints(current, [interaction.start, world]), "end", binding);
        const byId = new Map(store.elements.map((el) => [el.id, el]));
        setDraft(refreshArrow(arrow, byId));
        setBindingHint(binding);
        break;
      }

      case "draggingPoint": {
        const points = getArrowPoints(interaction.arrow);
        points[interaction.index] = world;
        // A store reposiciona as pontas ligadas, que miram o ponto vizinho.
        store.updateElements([setArrowPoints(interaction.arrow, points)]);
        break;
      }

      case "draggingSegment":
        store.updateElements([moveElbowSegment(interaction.original, interaction.index, world)]);
        break;

      case "draggingEndpoint": {
        const { original, end } = interaction;
        const other = getBinding(original, end === "start" ? "end" : "start");
        const binding = findBindingAt(world, [other?.elementId]);

        const points = getArrowPoints(original);
        points[end === "start" ? 0 : points.length - 1] = world;
        const arrow = setBinding(setArrowPoints(original, points), end, binding);
        // A store recalcula as pontas ligadas.
        store.updateElements([arrow]);
        setBindingHint(binding);
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
        if (dx === 0 && dy === 0) break;
        const moved = interaction.originals.map((el) => translateElement(el, dx, dy));
        store.updateElements(detachFromStaying(moved));
        break;
      }

      case "resizing": {
        const next = resizeBounds(
          interaction.bounds,
          interaction.handle,
          world.x - interaction.start.x,
          world.y - interaction.start.y,
        );
        const resized = resizeElementsToBounds(interaction.originals, interaction.bounds, next);
        store.updateElements(detachFromStaying(resized));
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
    setBindingHint(null);
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
      case "draggingEndpoint":
      case "draggingPoint":
      case "draggingSegment":
        store.commitHistory(interaction.before);
        break;
    }
  }

  function handlePointerCancel() {
    const interaction = interactionRef.current;
    // Desfaz o que estava sendo arrastado, sem criar passo no histórico.
    if (interaction?.kind === "moving" || interaction?.kind === "resizing") {
      useBoardStore.getState().updateElements(interaction.originals);
    } else if (
      interaction?.kind === "draggingEndpoint" ||
      interaction?.kind === "draggingPoint" ||
      interaction?.kind === "draggingSegment"
    ) {
      useBoardStore.getState().updateElements([interaction.original]);
    }
    endInteraction();
  }

  /**
   * Duplo clique numa alça da seta selecionada: remove o ponto do meio (reta
   * e curva) ou devolve a ortogonal ajustada à mão à rota automática.
   * Devolve `true` se tratou o clique.
   */
  function handleArrowHandleDoubleClick(world: Point): boolean {
    const store = useBoardStore.getState();
    const arrow = getSingleArrow(getSelectedElements());
    const handle = arrow && getArrowHandleAt(arrow, world, store.viewport.zoom);
    if (!arrow || !handle) return false;

    const byId = new Map(store.elements.map((el) => [el.id, el]));
    if (handle.kind === "point") {
      store.replaceElement(removeArrowPoint(arrow, handle.index, byId));
    } else if (handle.kind === "segment" && isSegmentFixed(arrow, handle.index)) {
      store.replaceElement(releaseElbowSegment(arrow, handle.index, byId));
    }
    // Pontas e alças do meio não fazem nada, mas o clique foi numa alça:
    // não deve virar edição de texto nem criar um texto novo.
    return true;
  }

  /**
   * Duplo clique: edita um texto existente, edita o rótulo da forma clicada
   * (pela borda ou pelo interior, mesmo sem preenchimento) ou cria um texto
   * novo ali.
   */
  function handleDoubleClick(e: React.MouseEvent) {
    const store = useBoardStore.getState();
    if (store.tool !== "selection" || editing) return;

    const world = screenToWorld(getScreenPoint(e), store.viewport);
    if (handleArrowHandleDoubleClick(world)) return;
    const tolerance = HIT_TOLERANCE / store.viewport.zoom;
    const hit = getElementAtPoint(store.elements, world, tolerance);
    const shape = hit ? hit : getLabelTargetAt(store.elements, world, 0);

    if (hit?.type === "text") {
      startEditingText(hit, false);
    } else if (shape && isBoxElement(shape)) {
      startEditingLabel(shape);
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
          initialText={editing.kind === "text" ? editing.element.text : (editing.element.label?.text ?? "")}
          fontSize={
            editing.kind === "text"
              ? editing.element.fontSize
              : (editing.element.label?.fontSize ?? LABEL_FONT_SIZE)
          }
          color={editing.element.style.strokeColor}
          layout={editorLayout(editing)}
          viewport={viewport}
          onSubmit={finishEditing}
        />
      )}
    </>
  );
}
