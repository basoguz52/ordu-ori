/** "2026-08-08 16:25:50" | ISO -> "08 Ağustos 2026" */
export function formatDateTR(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Aynı günse tek tarih, farklıysa "05 - 06 Ekim 2026" benzeri aralık. */
export function formatDateRangeTR(start?: string | null, end?: string | null): string {
  const s = formatDateTR(start);
  if (!end || end === start) return s;
  const e = formatDateTR(end);
  if (!e || e === s) return s;
  return `${s} – ${e}`;
}
