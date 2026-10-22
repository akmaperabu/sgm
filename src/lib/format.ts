const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const pad = (n: number) => String(n).padStart(2, "0");

export function fmtDate(d?: Date | string | null) {
  if (!d) return "-";
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function fmtDateTime(d?: Date | string | null) {
  if (!d) return "-";
  const x = new Date(d);
  return `${fmtDate(x)} ${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

/** "2026-10" -> "Oktober 2026" */
export function periodLabel(name: string) {
  const [y, m] = name.split("-");
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const daysBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);

/** Tanggal jatuh tempo berikutnya: `months` bulan setelah `from`, pada tanggal tetap `day`. */
export function nextOccurrence(from: Date, months: number, day: number) {
  const y = from.getFullYear();
  const m = from.getMonth() + months;
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, last));
}

/** Tanggal jatuh tempo pertama pada/setelah `from` dengan tanggal tetap `day`. */
export function firstOccurrence(from: Date, day: number) {
  const last = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
  const cand = new Date(from.getFullYear(), from.getMonth(), Math.min(day, last));
  return cand >= startOfDay(from) ? cand : nextOccurrence(from, 1, day);
}

export const num = (n: number) => n.toLocaleString("id-ID");
