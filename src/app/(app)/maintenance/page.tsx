import Link from "next/link";
import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge, Empty, btnPrimary, btnSecondary, table, tableWrap, td, th } from "@/components/ui";
import { assetCategoryLabel, siteLabel } from "@/lib/constants";
import { daysBetween, fmtDate, num } from "@/lib/format";
import { ArrowUpRight, Calendar, Siren } from "lucide-react";

export default async function MaintenanceMonitoringPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);
  const today = new Date();

  // Queries
  const [assets, activeCorrective, upcomingPreventive, periodTickets] = await Promise.all([
    prisma.asset.findMany({
      where: ctx.siteWhere,
      include: {
        tickets: {
          where: { status: { in: ["Open", "In Progress", "Upcoming"] } },
        },
        _count: {
          select: {
            tickets: { where: { type: "CORRECTIVE" } },
          },
        },
      },
      orderBy: [{ siteId: "asc" }, { category: "asc" }, { code: "asc" }],
    }),
    prisma.maintenanceTicket.findMany({
      where: {
        ...ctx.siteWhere,
        type: "CORRECTIVE",
        status: { in: ["Open", "In Progress"] },
      },
      include: { asset: true, requester: true },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.maintenanceTicket.findMany({
      where: {
        ...ctx.siteWhere,
        type: "PREVENTIVE",
        status: "Upcoming",
      },
      include: { asset: true },
      orderBy: [{ dueDate: "asc" }],
    }),
    prisma.maintenanceTicket.findMany({
      where: {
        ...ctx.siteWhere,
        type: "PREVENTIVE",
        dueDate: {
          gte: ctx.period.startDate,
          lte: ctx.period.endDate,
        },
      },
      include: { asset: true },
      orderBy: [{ dueDate: "asc" }],
    }),
  ]);

  // Calculations
  const activeAssets = assets.filter((a) => a.isActive);
  const totalAssetsCount = activeAssets.length;

  const breakdownAssetIds = new Set(activeCorrective.map((t) => t.assetId));
  const underRepairCount = breakdownAssetIds.size;

  const overdueTickets = upcomingPreventive.filter((t) => t.dueDate && daysBetween(today, t.dueDate) < 0);
  const dueSoonTickets = upcomingPreventive.filter((t) => {
    if (!t.dueDate) return false;
    const diff = daysBetween(today, t.dueDate);
    return diff >= 0 && diff <= 7;
  });

  const overdueAssetIds = new Set(overdueTickets.map((t) => t.assetId));
  const readyAssetsCount = activeAssets.filter(
    (a) => !breakdownAssetIds.has(a.id) && !overdueAssetIds.has(a.id)
  ).length;

  const readyPercentage = totalAssetsCount > 0 ? Math.round((readyAssetsCount / totalAssetsCount) * 100) : 100;

  const acetyleneCount = activeAssets.filter((a) => a.category === "ACETYLENE").length;
  const oxygenCount = activeAssets.filter((a) => a.category === "OXYGEN").length;
  const truckCount = activeAssets.filter((a) => a.category === "UNIT_TRUCK").length;

  const weeks = [
    { label: "Minggu 1 (Tgl 1 - 7)", start: 1, end: 7 },
    { label: "Minggu 2 (Tgl 8 - 14)", start: 8, end: 14 },
    { label: "Minggu 3 (Tgl 15 - 21)", start: 15, end: 21 },
    { label: "Minggu 4+ (Tgl 22 - Akhir)", start: 22, end: 31 },
  ];

  const weeklySchedule = weeks.map((w) => {
    const items = periodTickets.filter((t) => {
      if (!t.dueDate) return false;
      const d = t.dueDate.getDate();
      return d >= w.start && d <= w.end;
    });
    return { ...w, items };
  });

  const problemAssets = [...assets]
    .filter((a) => a._count.tickets > 0)
    .sort((a, b) => b._count.tickets - a._count.tickets)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        ctx={ctx}
        title="Monitoring Maintenance"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/maintenance/requests" className={btnSecondary}>
              <Siren className="h-4 w-4 text-slate-500" />
              <span>Tiket Perbaikan</span>
            </Link>
            <Link href="/maintenance/schedule" className={btnPrimary}>
              <Calendar className="h-4 w-4" />
              <span>Jadwal Servis</span>
            </Link>
          </div>
        }
      />

      {/* KPI METRIC CARDS - CLEAN INDUSTRIAL MONOCHROME */}
      <section className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Readiness */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Kesiapan Aset</span>
              <span className="font-mono text-slate-400">{readyPercentage}% Ready</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {num(readyAssetsCount)}
              </span>
              <span className="text-xs font-medium text-slate-500">/ {totalAssetsCount} unit</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>C2H2: {acetyleneCount}</span>
            <span>O2: {oxygenCount}</span>
            <span>Truk: {truckCount}</span>
          </div>
        </div>

        {/* Card 2: Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Sedang Rusak</span>
              {underRepairCount > 0 ? (
                <Badge tone="red" dot>
                  {underRepairCount} Unit
                </Badge>
              ) : (
                <Badge tone="green" dot>
                  Nol
                </Badge>
              )}
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {num(underRepairCount)}
              </span>
              <span className="text-xs font-medium text-slate-500">unit perbaikan</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tiket aktif</span>
            <span className="font-mono font-semibold text-slate-700">{activeCorrective.length} tiket</span>
          </div>
        </div>

        {/* Card 3: Overdue & H-7 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Jadwal Mendesak</span>
              {overdueTickets.length > 0 ? (
                <Badge tone="red" dot>
                  {overdueTickets.length} Overdue
                </Badge>
              ) : dueSoonTickets.length > 0 ? (
                <Badge tone="amber" dot>
                  {dueSoonTickets.length} H-7
                </Badge>
              ) : (
                <Badge tone="slate" dot={false}>
                  Aman
                </Badge>
              )}
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {num(overdueTickets.length + dueSoonTickets.length)}
              </span>
              <span className="text-xs font-medium text-slate-500">jadwal</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Overdue: {overdueTickets.length}</span>
            <span>H-7: {dueSoonTickets.length}</span>
          </div>
        </div>

        {/* Card 4: Routine Realization */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Realisasi Bulan Ini</span>
              <span className="font-mono text-slate-400">{periodTickets.length} agenda</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {num(periodTickets.filter((t) => t.status === "Completed" || t.status === "Skipped").length)}
              </span>
              <span className="text-xs font-medium text-slate-500">/ {periodTickets.length} tereksekusi</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Selesai: {periodTickets.filter((t) => t.status === "Completed").length}</span>
            <span>Skip: {periodTickets.filter((t) => t.status === "Skipped").length}</span>
          </div>
        </div>
      </section>

      {/* ACTION CENTER - TWO CLEAN INDUSTRIAL TABLES / LISTS */}
      <section className="grid gap-4 sm:gap-5 xl:grid-cols-2">
        {/* Kolom Kiri: Kerusakan Aktif */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Kerusakan Butuh Penanganan</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Tiket perbaikan yang masih berjalan</p>
            </div>
            <Link
              href="/maintenance/requests"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800"
            >
              <span>Semua Tiket</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white shadow-2xs">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60 text-slate-500">
                  <th className="px-3 py-2.5 font-medium">Aset</th>
                  <th className="px-3 py-2.5 font-medium">Urgensi</th>
                  <th className="px-3 py-2.5 font-medium">Deskripsi Kerusakan</th>
                  <th className="px-3 py-2.5 font-medium">Tgl</th>
                  <th className="px-3 py-2.5 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCorrective.slice(0, 5).map((t) => (
                  <tr key={t.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      <div>{t.asset.name}</div>
                      <span className="block font-mono text-[11px] text-slate-400 mt-0.5">
                        {t.asset.code} • {siteLabel(t.siteId)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={t.urgency === "Critical" ? "red" : t.urgency === "High" ? "amber" : "blue"}>
                        {t.urgency}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 max-w-44 truncate text-slate-600">{t.description}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {fmtDate(t.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <Link
                        href="/maintenance/requests"
                        title="Proses Tiket Perbaikan"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 hover:text-blue-700 hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-2xs active:scale-95"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {!activeCorrective.length && (
                  <Empty cols={5} text="Seluruh lini alat dalam kondisi normal. Tidak ada tiket kerusakan aktif." />
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom Kanan: Servis Rutin Mendesak */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Jadwal Servis Mendesak</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Tiket preventif yang jatuh tempo atau H-7</p>
            </div>
            <Link
              href="/maintenance/schedule"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800"
            >
              <span>Buka Jadwal</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white shadow-2xs">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60 text-slate-500">
                  <th className="px-3 py-2.5 font-medium">Aset</th>
                  <th className="px-3 py-2.5 font-medium">Kategori</th>
                  <th className="px-3 py-2.5 font-medium">Jatuh Tempo</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...overdueTickets, ...dueSoonTickets].slice(0, 5).map((t) => {
                  const diff = t.dueDate ? daysBetween(today, t.dueDate) : 0;
                  const isLate = diff < 0;
                  return (
                    <tr key={t.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-slate-900">
                        <div>{t.asset.name}</div>
                        <span className="block font-mono text-[11px] text-slate-400 mt-0.5">
                          {t.asset.code} • {siteLabel(t.siteId)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{assetCategoryLabel(t.asset.category)}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {fmtDate(t.dueDate)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {isLate ? (
                          <Badge tone="red" dot>
                            Terlambat {-diff} hr
                          </Badge>
                        ) : diff === 0 ? (
                          <Badge tone="amber" dot>
                            Hari Ini
                          </Badge>
                        ) : (
                          <Badge tone="amber" dot>
                            H-{diff}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <Link
                          href="/maintenance/schedule"
                          title="Buka Jadwal Servis"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 hover:text-blue-700 hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-2xs active:scale-95"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!overdueTickets.length && !dueSoonTickets.length && (
                  <Empty cols={5} text="Semua agenda servis preventif aman dan berada di luar batas H-7." />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* AGENDA PREVENTIF MINGGUAN - CRISP INDUSTRIAL GRID */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Agenda Servis Rutin Bulan Ini</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Distribusi jatuh tempo servis pada periode {ctx.period.periodName}</p>
          </div>
          <Link
            href="/maintenance/schedule"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800"
          >
            <span>Kelola Jadwal</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {weeklySchedule.map((w, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-xs font-bold text-slate-800">{w.label}</span>
                <span className="font-mono text-xs font-semibold text-slate-500">{w.items.length}</span>
              </div>
              <div className="space-y-1.5">
                {w.items.map((t) => {
                  const isDone = t.status === "Completed";
                  const isSkip = t.status === "Skipped";
                  const isLate = t.status === "Upcoming" && t.dueDate && daysBetween(today, t.dueDate) < 0;

                  return (
                    <div
                      key={t.id}
                      className="rounded-lg border border-slate-200/80 bg-white p-2.5 shadow-2xs text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-slate-900 truncate">{t.asset.name}</span>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">tgl {t.dueDate?.getDate()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="text-slate-500 font-mono text-[10px]">{t.asset.code}</span>
                        {isDone ? (
                          <Badge tone="green">Selesai</Badge>
                        ) : isSkip ? (
                          <Badge tone="slate">Di-skip</Badge>
                        ) : isLate ? (
                          <Badge tone="red" dot>
                            Overdue
                          </Badge>
                        ) : (
                          <Badge tone="amber" dot>
                            Upcoming
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!w.items.length && (
                  <div className="py-3 text-center text-xs text-slate-400 font-mono">Kosong</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ANALISIS KEANDALAN ASET - CLEAN MONOCHROME TABLE */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Analisis Keandalan Aset</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Daftar aset berdasarkan riwayat frekuensi kerusakan (evaluasi unit rewel / overhaul)
            </p>
          </div>
          <Link
            href="/maintenance/assets"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800"
          >
            <span>Master Aset</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>Aset</th>
                <th className={th}>Kode</th>
                <th className={th}>Kategori</th>
                {ctx.site === "ALL" && <th className={th}>Site</th>}
                <th className={`${th} text-right`}>Total Perbaikan</th>
                <th className={th}>Servis Terakhir</th>
                <th className={th}>Status Keandalan</th>
                <th className={th}>Jadwal Rutin Berikutnya</th>
              </tr>
            </thead>
            <tbody>
              {problemAssets.map((a) => {
                const count = a._count.tickets;
                const isHighRisk = count >= 3;
                return (
                  <tr key={a.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className={`${td} font-medium text-slate-900`}>{a.name}</td>
                    <td className={`${td} font-mono text-xs text-slate-500`}>{a.code}</td>
                    <td className={td}>{assetCategoryLabel(a.category)}</td>
                    {ctx.site === "ALL" && <td className={td}>{siteLabel(a.siteId)}</td>}
                    <td className={`${td} text-right font-mono font-semibold text-slate-900`}>
                      {count} kali
                    </td>
                    <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(a.lastServiceDate)}</td>
                    <td className={td}>
                      {isHighRisk ? (
                        <Badge tone="red" dot>
                          Perlu Evaluasi (&ge;3x)
                        </Badge>
                      ) : (
                        <Badge tone="slate">Normal</Badge>
                      )}
                    </td>
                    <td className={`${td} font-mono text-xs text-slate-600`}>{fmtDate(a.nextDueDate)}</td>
                  </tr>
                );
              })}
              {!problemAssets.length && (
                <Empty cols={8} text="Belum ada riwayat perbaikan kerusakan pada aset di site ini." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
