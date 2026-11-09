import { useId } from "react";
import type { Arrowhead } from "../../../lib/elements/types";
import type { ArrowEnd } from "../../../lib/elements/bindings";
import { getArrowheadHoles, getArrowheadParts, type ArrowheadPart } from "../../../lib/elements/arrowheads";

const TIP = { x: 21, y: 12 };
const SHAFT_START = 3;
const HEAD_SIZE = 10;

function Part({ part }: { part: ArrowheadPart }) {
  switch (part.kind) {
    case "line":
      return <line x1={part.from.x} y1={part.from.y} x2={part.to.x} y2={part.to.y} />;
    case "polygon":
      return (
        <polygon
          points={part.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={part.filled ? "currentColor" : "none"}
        />
      );
    case "circle":
      return (
        <circle
          cx={part.center.x}
          cy={part.center.y}
          r={part.radius}
          fill={part.filled ? "currentColor" : "none"}
        />
      );
  }
}

export function ArrowheadIcon({ arrowhead, end }: { arrowhead: Arrowhead; end: ArrowEnd }) {
  const maskId = useId();
  const geometry = getArrowheadParts(arrowhead, TIP, Math.PI, HEAD_SIZE);
  const holes = geometry ? getArrowheadHoles(geometry) : [];
  const shaftEnd = TIP.x - (geometry?.retreat ?? 0);

  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {holes.length > 0 && (
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="white" stroke="none" />
          {holes.map(({ center, radius }, i) => (
            <circle key={i} cx={center.x} cy={center.y} r={radius} fill="black" stroke="none" />
          ))}
        </mask>
      )}
      <g transform={end === "start" ? "matrix(-1 0 0 1 24 0)" : undefined}>
        <line
          x1={SHAFT_START}
          y1={TIP.y}
          x2={shaftEnd}
          y2={TIP.y}
          mask={holes.length > 0 ? `url(#${maskId})` : undefined}
        />
        {geometry?.parts.map((part, i) => <Part key={i} part={part} />)}
      </g>
    </svg>
  );
}
