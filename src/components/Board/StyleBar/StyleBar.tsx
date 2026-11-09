import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { LuEllipsis } from "react-icons/lu";
import styles from "./StyleBar.module.scss";
import { TRANSPARENT } from "../../../lib/elements/types";
import type { Bounds } from "../../../lib/geometry/bounds";
import { useBoardStore } from "../../../store/boardStore";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { Panel } from "../../../ui/Panel/Panel";
import { Popover } from "../../../ui/Popover/Popover";
import { ROUTING_OPTIONS } from "./routing";
import { arrowSelectors, scopeSupports, selectScope, styleSelectors } from "./selectors";
import { ArrowControls, FillControls, StrokeControls } from "./StyleControls";

const BAR_GAP = 12;
const VIEWPORT_MARGIN = 8;

function StrokeSwatch({ color }: { color: string }) {
  return <span className={styles.strokeSwatch} style={{ borderColor: color }} />;
}

function FillSwatch({ color }: { color: string }) {
  return (
    <span
      className={styles.swatch}
      data-transparent={color === TRANSPARENT}
      style={color === TRANSPARENT ? undefined : { background: color }}
    />
  );
}

interface StyleGroupProps {
  label: string;
  icon: IconType;
  children: React.ReactNode;
}

function StyleGroup({ label, icon, children }: StyleGroupProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);

  return (
    <div ref={anchorRef}>
      <IconButton
        icon={icon}
        label={label}
        size="sm"
        tooltipSide="top"
        hasPopup
        active={anchor !== null}
        onClick={() => setAnchor((open) => (open ? null : anchorRef.current))}
      />
      {anchor && (
        <Popover anchor={anchor} onClose={close}>
          <Panel label={label}>{children}</Panel>
        </Popover>
      )}
    </div>
  );
}

export type StyleBarPlacement = { kind: "selection"; rect: Bounds } | { kind: "top" };

interface StyleBarProps {
  placement: StyleBarPlacement;
  viewportWidth: number;
}

function barPosition(placement: StyleBarPlacement, size: { width: number; height: number }, viewportWidth: number) {
  const half = size.width / 2;
  const clampX = (x: number) =>
    Math.min(Math.max(x, VIEWPORT_MARGIN + half), Math.max(VIEWPORT_MARGIN + half, viewportWidth - VIEWPORT_MARGIN - half));
  if (placement.kind === "top") return { left: clampX(viewportWidth / 2), top: VIEWPORT_MARGIN };
  const { rect } = placement;
  const above = rect.y - BAR_GAP - size.height;
  const top = above >= VIEWPORT_MARGIN ? above : rect.y + rect.height + BAR_GAP;
  return { left: clampX(rect.x + rect.width / 2), top };
}

export function StyleBar(props: StyleBarProps) {
  const scope = useBoardStore(selectScope);
  if (scope === "") return null;
  return <StyleBarContent {...props} scope={scope} />;
}

function StyleBarContent({ placement, viewportWidth, scope }: StyleBarProps & { scope: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const strokeColor = useBoardStore(styleSelectors.strokeColor);
  const fillColor = useBoardStore(styleSelectors.fillColor);
  const defaultRouting = useBoardStore((s) => s.arrowRouting);
  const routing = useBoardStore(arrowSelectors.routing) ?? defaultRouting;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.offsetWidth, height: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const strokeIcon: IconType =
    strokeColor === "mixed" ? LuEllipsis : () => <StrokeSwatch color={strokeColor} />;
  const fillIcon: IconType = fillColor === "mixed" ? LuEllipsis : () => <FillSwatch color={fillColor} />;
  const routingIcon =
    routing === "mixed" ? LuEllipsis : (ROUTING_OPTIONS.find((o) => o.routing === routing)?.icon ?? LuEllipsis);

  return (
    <div
      ref={ref}
      className={styles.bar}
      role="toolbar"
      aria-label="Estilo"
      style={barPosition(placement, size, viewportWidth)}
    >
      <StyleGroup label="Contorno" icon={strokeIcon}>
        <StrokeControls />
      </StyleGroup>
      {scopeSupports(scope, "fillColor") && (
        <StyleGroup label="Preenchimento" icon={fillIcon}>
          <FillControls />
        </StyleGroup>
      )}
      {scope.split(",").includes("arrow") && (
        <StyleGroup label="Seta" icon={routingIcon}>
          <ArrowControls />
        </StyleGroup>
      )}
    </div>
  );
}
