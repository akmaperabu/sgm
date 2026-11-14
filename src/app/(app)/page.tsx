import Link from "next/link";
import { Wrench, ArrowUpRight } from "lucide-react";
import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge, Empty, StatusBadge, StockBadge, table, tableWrap, td, th } from "@/components/ui";
import { assetCategoryLabel, categoryLabel, siteLabel } from "@/lib/constants";
import { daysBetween, fmtDate, num } from "@/lib/format";

export default async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);
  const w = ctx.siteWhere;
  const today = new Date();

  const [items, prs, tickets, pendingIssues, cardAgg] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { ...w, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        siteId: true,
        currentStock: true,
        minStock: true,
      },
    }),
    prisma.purchaseRequest.findMany({
      where: { ...w, status: { notIn: ["Complete", "Rejected"] } },
      select: {
        id: true,
        prNumber: true,
        siteId: true,
        status: true,
        qty: true,
        isNewItem: true,
        newItemName: true,
        item: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.maintenanceTicket.findMany({
      where: { ...w, status: { in: ["Upcoming", "Open", "In Progress"] } },
      select: {
        id: true,
        siteId: true,
        type: true,
        status: true,
        dueDate: true,
        createdAt: true,
        asset: { select: { code: true, name: true, category: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.goodsIssue.count({ where: { ...w, status: "Pending Approval" } }),
    prisma.inventoryStockCard.aggregate({
      where: { ...w, periodId: ctx.period.id },
      _sum: { qtyIn: true, qtyOut: true },
    }),
  ]);

  const low = items.filter((i) => i.currentStock <= i.minStock).sort((a, b) => a.currentStock - b.currentStock);
  const totIn = cardAgg._sum.qtyIn ?? 0;
  const totOut = cardAgg._sum.qtyOut ?? 0;
  const totalStock = items.reduce((s, i) => s + i.currentStock, 0);
  const overdue = tickets.filter((t) => t.type === "PREVENTIVE" && t.dueDate && t.dueDate < today && daysBetween(today, t.dueDate) < 0).length;

  return (
    <div className="space-y-6">
      <PageHeader ctx={ctx} title="Dashboard Overview" />

      <section className="space-y-3">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">Total Stok Gudang</span>
                <span className="font-mono text-slate-400">{items.length} item</span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{num(totalStock)}</span>
                <span className="text-xs font-medium text-slate-500">unit</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Masuk: +{num(totIn)}</span>
              <span>Keluar: -{num(totOut)}</span>
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">Pengadaan (PR / PO)</span>
                <span className="font-mono text-slate-400">Berjalan</span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{num(prs.length)}</span>
                <span className="text-xs font-medium text-slate-500">dokumen</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Pending Issue Gudang</span>
              <span className="font-mono font-semibold text-slate-700">{pendingIssues} request</span>
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">Tiket Maintenance</span>
                {overdue > 0 ? (
                  <Badge tone="red" dot>{overdue} Overdue</Badge>
                ) : (
                  <Badge tone="green" dot>H-7 Standby</Badge>
                )}
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{num(tickets.length)}</span>
                <span className="text-xs font-medium text-slate-500">tiket aktif</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Jadwal Harian &amp; Rutin</span>
              <span className="font-mono text-slate-600">Site {ctx.site === "ALL" ? "Pusat" : siteLabel(ctx.site)}</span>
            </div>
          </div>

        </div>
      </section>

      <section className="grid gap-4 sm:gap-5 xl:grid-cols-2">
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inventory Snapshot</h3>
            </div>
            <Link
              href="/items"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800"
            >
              <span>Master Barang</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="text-[11px] font-medium text-slate-500">Total Item</div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900">{items.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="text-[11px] font-medium text-slate-500">Menipis / Habis</div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900">{low.length}</div>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="text-[11px] font-medium text-slate-500">Stok Aman</div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900">
                {items.length - low.length}
              </div>
            </div>
          </div>

          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>Barang</th>
                  <th className={th}>Kode</th>
                  <th className={th}>Site</th>
                  <th className={`${th} text-right`}>Stok</th>
                  <th className={`${th} text-right`}>Min</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {low.slice(0, 6).map((i) => (
                  <tr key={i.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className={`${td} font-medium text-slate-900`}>
                      {i.name}
                      <span className="block text-xs font-normal text-slate-400 mt-0.5">{categoryLabel(i.category)}</span>
                    </td>
                    <td className={`${td} font-mono text-xs text-slate-500`}>{i.code}</td>
                    <td className={td}>{siteLabel(i.siteId)}</td>
                    <td className={`${td} text-right font-mono font-semibold text-slate-900`}>{num(i.currentStock)}</td>
                    <td className={`${td} text-right font-mono text-slate-400`}>{num(i.minStock)}</td>
                    <td className={td}><StockBadge stock={i.currentStock} min={i.minStock} /></td>
                  </tr>
                ))}
                {!low.length && <Empty cols={6} text="Semua stok gudang berada di level aman." />}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Procurement &amp; Maintenance Live</h3>
            </div>
            <Link
              href="/purchasing"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800"
            >
              <span>Semua Transaksi</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>No. PR</th>
                  <th className={th}>Barang</th>
                  <th className={`${th} text-right`}>Qty</th>
                  <th className={th}>Site</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {prs.slice(0, 5).map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className={`${td} font-mono text-xs font-semibold text-slate-900`}>{p.prNumber}</td>
                    <td className={td}>
                      <span className="font-medium text-slate-900">{p.item?.name ?? p.newItemName}</span>
                      {p.isNewItem && <span className="ml-2"><Badge tone="slate">Barang Baru</Badge></span>}
                    </td>
                    <td className={`${td} text-right font-mono font-semibold text-slate-900`}>{num(p.qty)}</td>
                    <td className={td}>{siteLabel(p.siteId)}</td>
                    <td className={td}><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
                {!prs.length && <Empty cols={5} text="Tidak ada PR pengadaan yang sedang berjalan." />}
              </tbody>
            </table>
          </div>

          <div className="pt-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Jadwal Rutin Mendatang (H-7)</span>
              <Link href="/maintenance/schedule" className="text-[11px] font-semibold text-blue-700 hover:underline">
                Buka Jadwal Rutin
              </Link>
            </div>
            <div className="space-y-2">
              {tickets.slice(0, 3).map((t) => {
                const late = t.type === "PREVENTIVE" && t.dueDate && daysBetween(today, t.dueDate) < 0;
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{t.asset.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{t.asset.code} • {assetCategoryLabel(t.asset.category)} • {siteLabel(t.siteId)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-medium text-slate-600 mb-1">{fmtDate(t.dueDate)}</div>
                      {late ? <StatusBadge status="Overdue" /> : <StatusBadge status={t.status} />}
                    </div>
                  </div>
                );
              })}
              {!tickets.length && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">
                  Tidak ada tiket maintenance aktif.
                </div>
              )}
            </div>
          </div>

        </div>

      </section>
    </div>
  );
}
