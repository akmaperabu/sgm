import { Suspense, type ReactNode } from "react";
import { Archive } from "lucide-react";
import type { Ctx } from "@/lib/context";
import { periodLabel } from "@/lib/format";
import { PeriodSelector } from "./period-selector";

export function PageHeader({
  ctx,
  title,
  desc,
  actions,
  showPeriod = true,
}: {
  ctx: Ctx;
  title: string;
  desc?: string;
  actions?: ReactNode;
  showPeriod?: boolean;
}) {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {desc && <p className="mt-0.5 text-xs font-medium text-slate-500 leading-relaxed">{desc}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {showPeriod && (
            <Suspense fallback={null}>
              <PeriodSelector
                isAdmin={ctx.isAdmin}
                current={ctx.period.periodName}
                periods={ctx.periods.map((p) => ({
                  periodName: p.periodName,
                  label: periodLabel(p.periodName),
                  isActive: p.isActive,
                }))}
              />
            </Suspense>
          )}
          {actions}
        </div>
      </div>

      {ctx.readOnly && showPeriod && (
        <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 sm:px-4 py-2.5 text-xs font-medium text-amber-900 shadow-sm">
          <Archive className="h-4 w-4 text-amber-700 shrink-0" />
          <span>
            Arsip periode <strong>{periodLabel(ctx.period.periodName)}</strong> (sudah cut-off) - data dalam mode hanya baca (read-only).
          </span>
        </div>
      )}
    </div>
  );
}

export function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs">
      <div className="mb-3.5 sm:mb-4 flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3">
        <h2 className="text-sm font-bold tracking-tight text-slate-900">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
