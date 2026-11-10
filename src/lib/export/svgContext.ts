interface DrawState {
  matrix: DOMMatrix;
  globalAlpha: number;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  lineDash: number[];
  lineDashOffset: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  clipId: string | null;
}

const TEXT_ANCHORS: Record<CanvasTextAlign, string> = {
  left: "start",
  start: "start",
  center: "middle",
  right: "end",
  end: "end",
};

const BASELINES: Record<CanvasTextBaseline, string> = {
  top: "text-before-edge",
  hanging: "hanging",
  middle: "central",
  alphabetic: "alphabetic",
  ideographic: "ideographic",
  bottom: "text-after-edge",
};

const ARC_SEGMENT = Math.PI / 2;

function format(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isInvisible(color: string): boolean {
  return color === "" || color === "none" || color === "transparent";
}

export class SvgContext {
  private state: DrawState = {
    matrix: new DOMMatrix(),
    globalAlpha: 1,
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    lineDash: [],
    lineDashOffset: 0,
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    clipId: null,
  };
  private stack: DrawState[] = [];
  private path: string[] = [];
  private hasCurrentPoint = false;
  private clipCount = 0;
  private readonly defs: string[] = [];
  private readonly body: string[] = [];
  private readonly measurer = document.createElement("canvas").getContext("2d");

  get globalAlpha() {
    return this.state.globalAlpha;
  }
  set globalAlpha(value: number) {
    this.state.globalAlpha = value;
  }
  get fillStyle() {
    return this.state.fillStyle;
  }
  set fillStyle(value: string) {
    this.state.fillStyle = value;
  }
  get strokeStyle() {
    return this.state.strokeStyle;
  }
  set strokeStyle(value: string) {
    this.state.strokeStyle = value;
  }
  get lineWidth() {
    return this.state.lineWidth;
  }
  set lineWidth(value: number) {
    this.state.lineWidth = value;
  }
  get lineCap() {
    return this.state.lineCap;
  }
  set lineCap(value: CanvasLineCap) {
    this.state.lineCap = value;
  }
  get lineJoin() {
    return this.state.lineJoin;
  }
  set lineJoin(value: CanvasLineJoin) {
    this.state.lineJoin = value;
  }
  get lineDashOffset() {
    return this.state.lineDashOffset;
  }
  set lineDashOffset(value: number) {
    this.state.lineDashOffset = value;
  }
  get font() {
    return this.state.font;
  }
  set font(value: string) {
    this.state.font = value;
  }
  get textAlign() {
    return this.state.textAlign;
  }
  set textAlign(value: CanvasTextAlign) {
    this.state.textAlign = value;
  }
  get textBaseline() {
    return this.state.textBaseline;
  }
  set textBaseline(value: CanvasTextBaseline) {
    this.state.textBaseline = value;
  }

  setLineDash(segments: number[]) {
    this.state.lineDash = [...segments];
  }

  getLineDash() {
    return [...this.state.lineDash];
  }

  save() {
    this.stack.push({ ...this.state, matrix: DOMMatrix.fromMatrix(this.state.matrix), lineDash: [...this.state.lineDash] });
  }

  restore() {
    const previous = this.stack.pop();
    if (previous) this.state = previous;
  }

  translate(x: number, y: number) {
    this.state.matrix = this.state.matrix.translate(x, y);
  }

  rotate(angle: number) {
    this.state.matrix = this.state.matrix.rotate((angle * 180) / Math.PI);
  }

  scale(x: number, y: number) {
    this.state.matrix = this.state.matrix.scale(x, y);
  }

  beginPath() {
    this.path = [];
    this.hasCurrentPoint = false;
  }

  closePath() {
    this.path.push("Z");
  }

  moveTo(x: number, y: number) {
    this.path.push(`M${this.point(x, y)}`);
    this.hasCurrentPoint = true;
  }

  lineTo(x: number, y: number) {
    if (!this.hasCurrentPoint) {
      this.moveTo(x, y);
      return;
    }
    this.path.push(`L${this.point(x, y)}`);
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    if (!this.hasCurrentPoint) this.moveTo(c1x, c1y);
    this.path.push(`C${this.point(c1x, c1y)} ${this.point(c2x, c2y)} ${this.point(x, y)}`);
  }

  quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
    if (!this.hasCurrentPoint) this.moveTo(cx, cy);
    this.path.push(`Q${this.point(cx, cy)} ${this.point(x, y)}`);
  }

  rect(x: number, y: number, width: number, height: number) {
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
    this.closePath();
  }

  arc(cx: number, cy: number, radius: number, start: number, end: number, counterclockwise = false) {
    let sweep = end - start;
    if (counterclockwise) sweep = sweep >= 0 ? sweep - Math.PI * 2 : Math.max(sweep, -Math.PI * 2);
    else sweep = sweep <= 0 ? sweep + Math.PI * 2 : Math.min(sweep, Math.PI * 2);

    const at = (angle: number) => ({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    const first = at(start);
    if (this.hasCurrentPoint) this.lineTo(first.x, first.y);
    else this.moveTo(first.x, first.y);

    const count = Math.max(1, Math.ceil(Math.abs(sweep) / ARC_SEGMENT));
    const step = sweep / count;
    const k = (4 / 3) * Math.tan(step / 4) * radius;
    for (let i = 0; i < count; i++) {
      const a0 = start + step * i;
      const a1 = a0 + step;
      const p0 = at(a0);
      const p1 = at(a1);
      this.bezierCurveTo(
        p0.x - k * Math.sin(a0),
        p0.y + k * Math.cos(a0),
        p1.x + k * Math.sin(a1),
        p1.y - k * Math.cos(a1),
        p1.x,
        p1.y,
      );
    }
  }

  stroke() {
    const { strokeStyle, lineDash, lineDashOffset, lineCap, lineJoin } = this.state;
    if (this.path.length === 0 || isInvisible(strokeStyle)) return;
    const scale = this.scaleFactor();
    const attrs = [
      `d="${this.path.join(" ")}"`,
      'fill="none"',
      `stroke="${escapeXml(strokeStyle)}"`,
      `stroke-width="${format(this.state.lineWidth * scale)}"`,
      `stroke-linecap="${lineCap}"`,
      `stroke-linejoin="${lineJoin}"`,
    ];
    if (lineDash.length > 0) {
      attrs.push(`stroke-dasharray="${lineDash.map((d) => format(d * scale)).join(" ")}"`);
      if (lineDashOffset !== 0) attrs.push(`stroke-dashoffset="${format(lineDashOffset * scale)}"`);
    }
    this.emit("path", attrs);
  }

  fill(fillRule: CanvasFillRule = "nonzero") {
    if (this.path.length === 0 || isInvisible(this.state.fillStyle)) return;
    this.emit("path", [
      `d="${this.path.join(" ")}"`,
      `fill="${escapeXml(this.state.fillStyle)}"`,
      `fill-rule="${fillRule}"`,
    ]);
  }

  clip(fillRule: CanvasFillRule = "nonzero") {
    const id = `clip-${++this.clipCount}`;
    const parent = this.state.clipId ? ` clip-path="url(#${this.state.clipId})"` : "";
    this.defs.push(
      `<clipPath id="${id}" clipPathUnits="userSpaceOnUse"${parent}><path d="${this.path.join(" ")}" clip-rule="${fillRule}"/></clipPath>`,
    );
    this.state.clipId = id;
  }

  fillText(text: string, x: number, y: number) {
    if (text === "" || isInvisible(this.state.fillStyle)) return;
    const { a, b, c, d, e, f } = this.state.matrix;
    this.emit(
      "text",
      [
        `x="${format(x)}"`,
        `y="${format(y)}"`,
        `fill="${escapeXml(this.state.fillStyle)}"`,
        `style="font: ${escapeXml(this.state.font)}; white-space: pre"`,
        `text-anchor="${TEXT_ANCHORS[this.state.textAlign]}"`,
        `dominant-baseline="${BASELINES[this.state.textBaseline]}"`,
      ],
      escapeXml(text),
      `matrix(${[a, b, c, d, e, f].map(format).join(" ")})`,
    );
  }

  measureText(text: string): TextMetrics {
    if (!this.measurer) return { width: 0 } as TextMetrics;
    this.measurer.font = this.state.font;
    return this.measurer.measureText(text);
  }

  toSvg(width: number, height: number, extras: { defs?: string; background?: string } = {}): string {
    const defs = [extras.defs ?? "", ...this.defs].join("");
    const background = extras.background
      ? `<rect width="100%" height="100%" fill="${escapeXml(extras.background)}"/>`
      : "";
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${format(width)}" height="${format(height)}" viewBox="0 0 ${format(width)} ${format(height)}">`,
      defs ? `<defs>${defs}</defs>` : "",
      background,
      ...this.body,
      "</svg>",
    ].join("\n");
  }

  private point(x: number, y: number): string {
    const p = this.state.matrix.transformPoint(new DOMPoint(x, y));
    return `${format(p.x)} ${format(p.y)}`;
  }

  private scaleFactor(): number {
    const { a, b, c, d } = this.state.matrix;
    return Math.sqrt(Math.abs(a * d - b * c));
  }

  private emit(tag: string, attrs: string[], content?: string, transform?: string) {
    const outer: string[] = [];
    if (this.state.globalAlpha < 1) outer.push(`opacity="${format(this.state.globalAlpha)}"`);
    if (this.state.clipId) outer.push(`clip-path="url(#${this.state.clipId})"`);
    const inner = transform ? [`transform="${transform}"`, ...attrs] : attrs;
    const open = `<${tag} ${(transform ? inner : [...inner, ...outer]).join(" ")}`;
    const element = content === undefined ? `${open}/>` : `${open}>${content}</${tag}>`;
    this.body.push(transform && outer.length > 0 ? `<g ${outer.join(" ")}>${element}</g>` : element);
  }
}
