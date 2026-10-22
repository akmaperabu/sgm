import type { ReactNode } from "react";
import { ToastNotification } from "./toast-notification";

export const btnBase =
  "inline-flex h-10 sm:h-9 items-center justify-center gap-2 rounded-full px-3.5 sm:px-4 text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs";
export const btnPrimary = `${btnBase} bg-blue-700 text-white hover:bg-blue-800 shadow-blue-700/20`;
export const btnSecondary = `${btnBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900`;
export const btnDanger = `${btnBase} border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`;
export const btnSm = "!h-8 sm:!h-7 !px-2.5 sm:!px-3 !text-[11px]";

export const inputCls =
  "h-10 sm:h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm sm:text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15 shadow-xs transition-all";
export const selectCls = `${inputCls} pr-8`;
export const labelCls = "mb-1.5 block text-xs font-semibold text-slate-700";

export const tableWrap = "overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-2xs touch-pan-x";
export const table = "w-full min-w-[620px] border-collapse text-left text-xs sm:text-[13.5px]";
export const th =
  "whitespace-nowrap border-b border-slate-200/70 bg-slate-50/60 px-4 py-3 sm:py-3.5 text-xs font-medium text-slate-500 tracking-normal select-none";
export const td = "border-b border-slate-100/90 px-4 py-3.5 sm:py-4 align-middle text-slate-600 text-xs sm:text-[13.5px] leading-snug";
export const stickyTh = "sticky left-0 z-10 bg-slate-50/95 backdrop-blur-sm border-r border-slate-200/60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)]";
export const stickyTd = "sticky left-0 z-[1] bg-white group-hover:bg-slate-50/60 transition-colors border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)]";
export const trHover = "group hover:bg-slate-50/50 transition-colors duration-150";

const TONES = {
  green: "bg-slate-50 border-slate-200/90 text-slate-700",
  blue: "bg-slate-50 border-slate-200/90 text-slate-700",
  amber: "bg-slate-50 border-slate-200/90 text-slate-700",
  red: "bg-slate-50 border-slate-200/90 text-slate-800",
  slate: "bg-slate-50 border-slate-200/90 text-slate-600",
} as const;

const DOT_TONES = {
  green: "bg-emerald-500",
  blue: "bg-blue-600",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  slate: "bg-slate-400",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = "slate", dot = false, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight select-none ${TONES[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT_TONES[tone]}`} />}
      <span>{children}</span>
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  Complete: "green", Completed: "green", Approved: "green",
  "On Process": "blue", "In Transit": "blue", "In Progress": "blue",
  Submitted: "amber", "Pending Approval": "amber", Upcoming: "amber", Open: "amber",
  Rejected: "red", Overdue: "red", Critical: "red", Skipped: "slate",
};
const STATUS_LABEL: Record<string, string> = { Upcoming: "Upcoming (H-7)" };

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "slate"} dot>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function StockBadge({ stock, min }: { stock: number; min: number }) {
  if (stock <= 0) return <Badge tone="red" dot>Habis</Badge>;
  if (stock <= min) return <Badge tone="amber" dot>Menipis</Badge>;
  return <Badge tone="green" dot>Aman</Badge>;
}

export function Empty({ cols, text = "Tidak ada data." }: { cols: number; text?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center text-xs font-medium text-slate-400">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 text-slate-400">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <span className="text-slate-500 font-medium text-xs">{text}</span>
        </div>
      </td>
    </tr>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export function Flash({ err, ok }: { err?: string; ok?: string }) {
  if (!err && !ok) return null;
  return <ToastNotification err={err} ok={ok} />;
}
