const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const VALID_INDEX = /^[0-9A-Za-z]*[1-9A-Za-z]$/;

export function isValidIndex(index: unknown): index is string {
  return typeof index === "string" && VALID_INDEX.test(index);
}

function digit(char: string | undefined, fallback: number): number {
  return char === undefined ? fallback : DIGITS.indexOf(char);
}

function midpoint(low: string, high: string | null): string {
  if (high !== null) {
    let shared = 0;
    while ((low[shared] ?? "0") === high[shared]) shared++;
    if (shared > 0) return high.slice(0, shared) + midpoint(low.slice(shared), high.slice(shared));
  }
  const lowDigit = digit(low[0], 0);
  const highDigit = high === null ? DIGITS.length : digit(high[0], 0);
  if (highDigit - lowDigit > 1) return DIGITS[Math.round((lowDigit + highDigit) / 2)];
  if (high !== null && high.length > 1) return high[0];
  return DIGITS[lowDigit] + midpoint(low.slice(1), null);
}

function indexAfter(index: string | null): string {
  if (index === null) return "V";
  for (let i = 0; i < index.length; i++) {
    const value = digit(index[i], 0);
    if (value < DIGITS.length - 1) return index.slice(0, i) + DIGITS[value + 1];
  }
  return `${index}1`;
}

function indexBefore(index: string): string {
  for (let i = 0; i < index.length; i++) {
    const value = digit(index[i], 0);
    if (value > 1) return index.slice(0, i) + DIGITS[value - 1];
  }
  return midpoint("", index);
}

export function indicesBetween(low: string | null, high: string | null, count: number): string[] {
  if (count <= 0) return [];
  if (high === null) {
    const indices: string[] = [];
    let last = low;
    for (let i = 0; i < count; i++) indices.push((last = indexAfter(last)));
    return indices;
  }
  if (low === null) {
    const indices: string[] = [];
    let first = high;
    for (let i = 0; i < count; i++) indices.unshift((first = indexBefore(first)));
    return indices;
  }
  const middle = midpoint(low, high);
  const before = Math.floor((count - 1) / 2);
  return [...indicesBetween(low, middle, before), middle, ...indicesBetween(middle, high, count - 1 - before)];
}

function isOrdered(indices: readonly (string | undefined)[]): boolean {
  let previous: string | null = null;
  for (const index of indices) {
    if (!isValidIndex(index) || (previous !== null && index <= previous)) return false;
    previous = index;
  }
  return true;
}

function longestIncreasingRun(indices: readonly (string | undefined)[]): Set<number> {
  const tails: number[] = [];
  const parents = new Array<number>(indices.length).fill(-1);
  indices.forEach((index, position) => {
    if (!isValidIndex(index)) return;
    let lowSlot = 0;
    let highSlot = tails.length;
    while (lowSlot < highSlot) {
      const mid = (lowSlot + highSlot) >> 1;
      if ((indices[tails[mid]] as string) < index) lowSlot = mid + 1;
      else highSlot = mid;
    }
    parents[position] = lowSlot > 0 ? tails[lowSlot - 1] : -1;
    tails[lowSlot] = position;
  });
  const kept = new Set<number>();
  for (let position = tails.at(-1) ?? -1; position !== -1; position = parents[position]) kept.add(position);
  return kept;
}

export function syncIndices<T extends { index?: string }>(items: T[]): T[] {
  const indices = items.map((item) => item.index);
  if (isOrdered(indices)) return items;
  const kept = longestIncreasingRun(indices);
  const result = [...items];
  let start = 0;
  while (start < items.length) {
    if (kept.has(start)) {
      start++;
      continue;
    }
    let end = start;
    while (end < items.length && !kept.has(end)) end++;
    const low = start > 0 ? (result[start - 1].index as string) : null;
    const high = end < items.length ? (items[end].index as string) : null;
    indicesBetween(low, high, end - start).forEach((index, offset) => {
      result[start + offset] = { ...items[start + offset], index };
    });
    start = end;
  }
  return result;
}
