import type { FillStyle, StrokeStyle } from "../../../lib/elements/types";

function Icon({ children }: { children: React.ReactNode }) {
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
      {children}
    </svg>
  );
}

export function StrokeWidthIcon({ width }: { width: number }) {
  return (
    <Icon>
      <line x1="4" y1="12" x2="20" y2="12" strokeWidth={width} />
    </Icon>
  );
}

const DASHES: Record<StrokeStyle, string | undefined> = {
  solid: undefined,
  dashed: "4 4",
  dotted: "0.5 4",
};

export function StrokeStyleIcon({ strokeStyle }: { strokeStyle: StrokeStyle }) {
  return (
    <Icon>
      <line x1="4" y1="12" x2="20" y2="12" strokeDasharray={DASHES[strokeStyle]} />
    </Icon>
  );
}

const ROUGHNESS_PATHS: Record<number, string> = {
  0: "M4 15 Q12 7 20 15",
  1: "M4 15 Q12 7 20 15 M5 16 Q12 9 19.5 14",
  2: "M4 15 Q7 9 11 12 T20 14 M5 16.5 Q9 8 13 13 T19 12",
};

export function RoughnessIcon({ roughness }: { roughness: number }) {
  return (
    <Icon>
      <path d={ROUGHNESS_PATHS[roughness]} strokeWidth="1.5" />
    </Icon>
  );
}

const FILL_LINES: Record<FillStyle, string | null> = {
  hachure: "M5 12 L12 5 M5 19 L19 5 M12 19 L19 12",
  "cross-hatch": "M5 12 L12 5 M5 19 L19 5 M12 19 L19 12 M5 12 L12 19 M5 5 L19 19 M12 5 L19 12",
  solid: null,
};

export function FillStyleIcon({ fillStyle }: { fillStyle: FillStyle }) {
  const lines = FILL_LINES[fillStyle];
  return (
    <Icon>
      <rect x="5" y="5" width="14" height="14" rx="2" fill={lines ? "none" : "currentColor"} />
      {lines && <path d={lines} strokeWidth="1.25" />}
    </Icon>
  );
}
