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

export function fmtMoney(n?: number | null) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

export interface AssetLifespanInfo {
  ageLabel: string;
  totalMonthsAge: number;
  totalLifespanMonths: number;
  targetExpiry: Date | null;
  hasTarget: boolean;
  status: "NORMAL" | "HEALTHY" | "WARNING" | "OVERDUE";
  statusLabel: string;
  percentUsed: number | null;
  remainingLabel: string | null;
  isOverdue: boolean;
  isNearEnd: boolean;
}

/**
 * Menghitung usia berjalan alat, target masa pakai (termasuk perpanjangan kalibrasi/rekondisi),
 * sisa waktu, persentase aus, dan status evaluasi.
 */
export function getAssetLifespanInfo(
  purchaseDate?: Date | string | null,
  lifespanMonths?: number | null,
  extendedMonths: number = 0,
  referenceDate: Date = new Date()
): AssetLifespanInfo | null {
  if (!purchaseDate) return null;

  const pDate = new Date(purchaseDate);
  const now = referenceDate;

  // Hitung usia dalam bulan
  let monthsAge = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());
  if (now.getDate() < pDate.getDate()) {
    monthsAge = Math.max(0, monthsAge - 1);
  }
  monthsAge = Math.max(0, monthsAge);

  const years = Math.floor(monthsAge / 12);
  const remainingMonths = monthsAge % 12;
  const ageLabel =
    years > 0
      ? remainingMonths > 0
        ? `${years} thn ${remainingMonths} bln`
        : `${years} thn`
      : monthsAge === 0
      ? "< 1 bln"
      : `${remainingMonths} bln`;

  if (!lifespanMonths || lifespanMonths <= 0) {
    return {
      ageLabel,
      totalMonthsAge: monthsAge,
      totalLifespanMonths: 0,
      targetExpiry: null,
      hasTarget: false,
      status: "NORMAL",
      statusLabel: "Tanpa Batas Target",
      percentUsed: null,
      remainingLabel: null,
      isOverdue: false,
      isNearEnd: false,
    };
  }

  const totalLifespanMonths = lifespanMonths + (extendedMonths || 0);
  const targetExpiry = new Date(pDate.getFullYear(), pDate.getMonth() + totalLifespanMonths, pDate.getDate());

  const diffDays = daysBetween(now, targetExpiry);
  const isOverdue = diffDays < 0;

  const percentUsed = Math.min(200, Math.max(0, Math.round((monthsAge / totalLifespanMonths) * 100)));

  const remainingMonthsDiff = totalLifespanMonths - monthsAge;
  let remainingLabel = "";
  if (isOverdue) {
    const overdueMonths = Math.abs(remainingMonthsDiff);
    const oYears = Math.floor(overdueMonths / 12);
    const oMonths = overdueMonths % 12;
    remainingLabel = `Lewat ${oYears > 0 ? `${oYears} thn ${oMonths} bln` : `${oMonths || 1} bln`}`;
  } else {
    const rYears = Math.floor(remainingMonthsDiff / 12);
    const rMonths = remainingMonthsDiff % 12;
    remainingLabel = `Sisa ${rYears > 0 ? `${rYears} thn ${rMonths} bln` : `${rMonths} bln`}`;
  }

  const isNearEnd = !isOverdue && (remainingMonthsDiff <= 6 || percentUsed >= 80);

  let status: "HEALTHY" | "WARNING" | "OVERDUE" = "HEALTHY";
  let statusLabel = "Prima / Normal";
  if (isOverdue) {
    status = "OVERDUE";
    statusLabel = "Perlu Kalibrasi / Rekondisi";
  } else if (isNearEnd) {
    status = "WARNING";
    statusLabel = "Mendekati Batas";
  }

  return {
    ageLabel,
    totalMonthsAge: monthsAge,
    totalLifespanMonths,
    targetExpiry,
    hasTarget: true,
    status,
    statusLabel,
    percentUsed,
    remainingLabel,
    isOverdue,
    isNearEnd,
  };
}
