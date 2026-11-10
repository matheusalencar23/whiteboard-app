const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const absolute = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatUpdatedAt(timestamp: number, now = Date.now()): string {
  const elapsed = now - timestamp;
  if (elapsed < MINUTE) return "Editado agora";
  if (elapsed < HOUR) return `Editado ${relative.format(-Math.floor(elapsed / MINUTE), "minute")}`;
  if (elapsed < DAY) return `Editado ${relative.format(-Math.floor(elapsed / HOUR), "hour")}`;
  if (elapsed < 7 * DAY) return `Editado ${relative.format(-Math.floor(elapsed / DAY), "day")}`;
  return `Editado em ${absolute.format(timestamp)}`;
}
