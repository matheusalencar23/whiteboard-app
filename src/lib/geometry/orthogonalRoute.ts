import type { Point } from "../types";
import type { Bounds } from "./bounds";

/**
 * Rota ortogonal (só linhas horizontais e verticais) entre duas pontas, como
 * as conexões do draw.io.
 *
 * A busca acontece numa grade pequena formada pelas linhas que passam pelas
 * pontas, pelas bordas dos obstáculos e pelos pontos médios entre eles. O
 * menor caminho (Dijkstra) soma o comprimento e um custo fixo por curva, então
 * a rota prefere poucas curvas e contorna os obstáculos por fora.
 */

/** Uma ponta da rota. */
export interface RouteEnd {
  point: Point;
  /**
   * Direção unitária de saída (no início) ou para fora da forma (no fim),
   * sempre num eixo. A rota sai do início nessa direção e chega ao fim na
   * direção oposta. Numa ponta solta é só a preferência: vale como desempate.
   */
  dir: Point;
  /**
   * Forma da ponta, já com a margem. A rota não passa por dentro dela e
   * começa com um trecho reto até a borda dela. `null` numa ponta solta.
   */
  obstacle: Bounds | null;
  /**
   * Ponta num canto de um trecho fixo (sem forma): a rota pode virar ali (com
   * o custo de uma curva), mas não pode voltar pelo eixo de `dir`.
   */
  corner?: boolean;
}

/** Custo de cada curva, em unidades de mundo de comprimento equivalente. */
const BEND_COST = 50;
/**
 * Custo extra de andar sobre a margem de um obstáculo. Só desempata: entre
 * duas rotas iguais, prefere o corredor do meio, que deixa os trechos das
 * pontas mais longos.
 */
const EDGE_COST = 1;
const EPSILON = 1e-6;

/** As 4 direções. O índice é usado no estado da busca. */
const DIRS: Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function dirIndex(d: Point): number {
  return DIRS.findIndex((v) => v.x === d.x && v.y === d.y);
}

/** O ponto está estritamente dentro da caixa (a borda não conta). */
function isInside(b: Bounds, p: Point): boolean {
  return (
    p.x > b.x + EPSILON &&
    p.x < b.x + b.width - EPSILON &&
    p.y > b.y + EPSILON &&
    p.y < b.y + b.height - EPSILON
  );
}

/** Onde a rota encosta na borda do obstáculo, saindo de `end.point` em `end.dir`. */
function stubPoint(end: RouteEnd): Point {
  const { point: p, dir: d, obstacle: o } = end;
  if (!o) return p;
  if (d.x > 0) return { x: Math.max(p.x, o.x + o.width), y: p.y };
  if (d.x < 0) return { x: Math.min(p.x, o.x), y: p.y };
  if (d.y > 0) return { x: p.x, y: Math.max(p.y, o.y + o.height) };
  return { x: p.x, y: Math.min(p.y, o.y) };
}

function uniqueSorted(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.filter((v, i) => i === 0 || v - sorted[i - 1] > EPSILON);
}

/** Linhas candidatas num eixo: pontas, bordas dos obstáculos e meios entre eles. */
function candidateLines(a: number, b: number, obstacles: Bounds[], axis: "x" | "y"): number[] {
  const lines = [a, b, (a + b) / 2];
  const ranges = obstacles.map((o) =>
    axis === "x" ? [o.x, o.x + o.width] : [o.y, o.y + o.height],
  );
  for (const [start, end] of ranges) lines.push(start, end);
  // Corredor entre dois obstáculos separados nesse eixo.
  if (ranges.length === 2) {
    const [[s1, e1], [s2, e2]] = ranges;
    if (e1 < s2) lines.push((e1 + s2) / 2);
    if (e2 < s1) lines.push((e2 + s1) / 2);
  }
  return uniqueSorted(lines);
}

/** Tira pontos repetidos e os pontos do meio de trechos retos. */
export function simplifyPath(points: Point[]): Point[] {
  const deduped = points.filter(
    (p, i) => i === 0 || Math.abs(p.x - points[i - 1].x) + Math.abs(p.y - points[i - 1].y) > EPSILON,
  );
  return deduped.filter((p, i) => {
    if (i === 0 || i === deduped.length - 1) return true;
    const a = deduped[i - 1];
    const b = deduped[i + 1];
    const collinearX = Math.abs(a.x - p.x) < EPSILON && Math.abs(p.x - b.x) < EPSILON;
    const collinearY = Math.abs(a.y - p.y) < EPSILON && Math.abs(p.y - b.y) < EPSILON;
    return !collinearX && !collinearY;
  });
}

export function routeOrthogonal(start: RouteEnd, end: RouteEnd): Point[] {
  const from = stubPoint(start);
  const to = stubPoint(end);
  const obstacles = [start.obstacle, end.obstacle].filter((o): o is Bounds => o !== null);
  const blocked = (p: Point) => obstacles.some((o) => isInside(o, p));

  const xs = candidateLines(from.x, to.x, obstacles, "x");
  const ys = candidateLines(from.y, to.y, obstacles, "y");
  const onLine = (lines: number[], v: number) => lines.some((l) => Math.abs(l - v) <= EPSILON);
  const edgeXs = obstacles.flatMap((o) => [o.x, o.x + o.width]);
  const edgeYs = obstacles.flatMap((o) => [o.y, o.y + o.height]);
  const nodeAt = (xi: number, yi: number) => xi * ys.length + yi;
  const nodeCount = xs.length * ys.length;
  const pointOf = (n: number): Point => ({ x: xs[Math.floor(n / ys.length)], y: ys[n % ys.length] });

  // As pontas estão sempre entre as linhas (a deduplicação pode ter juntado
  // valores quase iguais, por isso a tolerância).
  const near = (lines: number[], v: number) => lines.findIndex((l) => Math.abs(l - v) <= EPSILON);
  const startNode = nodeAt(near(xs, from.x), near(ys, from.y));
  const endNode = nodeAt(near(xs, to.x), near(ys, to.y));

  // Estado = nó + direção de chegada. Dijkstra simples (a grade tem poucas
  // dezenas de nós, então uma busca linear pelo menor custo basta).
  const stateCount = nodeCount * DIRS.length;
  const cost = new Array<number>(stateCount).fill(Infinity);
  const previous = new Array<number>(stateCount).fill(-1);
  const done = new Array<boolean>(stateCount).fill(false);
  const startDir = dirIndex(start.dir);
  // Ponta ligada sai obrigatoriamente na direção dela. Canto de trecho fixo
  // pode virar (custa uma curva), mas não voltar. Ponta solta pode sair em
  // qualquer direção, com uma leve preferência pela dela.
  DIRS.forEach((d, i) => {
    const reverse = d.x === -start.dir.x && d.y === -start.dir.y;
    let initial: number;
    if (i === startDir) initial = 0;
    else if (start.obstacle) initial = Infinity;
    else if (start.corner) initial = reverse ? Infinity : BEND_COST;
    else initial = EDGE_COST;
    cost[startNode * DIRS.length + i] = initial;
  });

  // Chegar ao fim indo para dentro da forma (oposto ao `dir` do fim) é o
  // certo; chegar em outra direção custa uma curva; na direção do `dir`
  // exigiria voltar pelo mesmo caminho. Canto de trecho fixo segue a mesma
  // regra. Ponta solta aceita qualquer chegada.
  const arrivalDir = dirIndex({ x: -end.dir.x, y: -end.dir.y });
  const finishCost = (d: number) => {
    if (d === arrivalDir) return 0;
    if (!end.obstacle && !end.corner) return EDGE_COST;
    if (DIRS[d].x === end.dir.x && DIRS[d].y === end.dir.y) return Infinity;
    return BEND_COST;
  };

  let bestEnd = -1;
  let bestTotal = Infinity;
  for (;;) {
    let state = -1;
    for (let s = 0; s < stateCount; s++) {
      if (!done[s] && cost[s] < Infinity && (state === -1 || cost[s] < cost[state])) state = s;
    }
    if (state === -1 || cost[state] >= bestTotal) break;
    done[state] = true;

    const node = Math.floor(state / DIRS.length);
    const dir = state % DIRS.length;
    if (node === endNode) {
      const total = cost[state] + finishCost(dir);
      if (total < bestTotal) {
        bestTotal = total;
        bestEnd = state;
      }
      continue;
    }

    const xi = Math.floor(node / ys.length);
    const yi = node % ys.length;
    const p = pointOf(node);
    DIRS.forEach((d, nd) => {
      // Sem meia-volta.
      if (d.x === -DIRS[dir].x && d.y === -DIRS[dir].y) return;
      const nxi = xi + d.x;
      const nyi = yi + d.y;
      if (nxi < 0 || nxi >= xs.length || nyi < 0 || nyi >= ys.length) return;
      const next = nodeAt(nxi, nyi);
      const q = pointOf(next);
      // Vizinhos são linhas consecutivas: se o meio do trecho está fora dos
      // obstáculos, o trecho inteiro está.
      if (blocked(q) || blocked({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })) return;

      const nextState = next * DIRS.length + nd;
      const onEdge = d.x === 0 ? onLine(edgeXs, p.x) : onLine(edgeYs, p.y);
      const step =
        Math.abs(q.x - p.x) +
        Math.abs(q.y - p.y) +
        (nd === dir ? 0 : BEND_COST) +
        (onEdge ? EDGE_COST : 0);
      if (cost[state] + step < cost[nextState]) {
        cost[nextState] = cost[state] + step;
        previous[nextState] = state;
      }
    });
  }

  let middle: Point[];
  if (bestEnd === -1) {
    // Sem rota pela grade (pontas dentro dos obstáculos, por exemplo): um "L".
    middle = [from, { x: to.x, y: from.y }, to];
  } else {
    middle = [];
    for (let s = bestEnd; s !== -1; s = previous[s]) {
      middle.unshift(pointOf(Math.floor(s / DIRS.length)));
    }
  }
  return simplifyPath([start.point, ...middle, end.point]);
}
