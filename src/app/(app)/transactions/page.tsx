import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader, Panel } from "@/components/page-header";
import { Badge, Empty, table, tableWrap, td, th } from "@/components/ui";
import { categoryLabel, siteLabel } from "@/lib/constants";
import { fmtDate, num, periodLabel } from "@/lib/format";
import { TransactionHistoryTable } from "@/components/transaction-history-table";
import { History } from "lucide-react";

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);

  const [movementsRaw, cards, allCards, issues, prs] = await Promise.all([
    prisma.stockMovement.findMany({
      where: {
        ...ctx.siteWhere,
        periodId: ctx.period.id,
      },
      include: {
        item: true,
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.inventoryStockCard.findMany({
      where: { ...ctx.siteWhere, periodId: ctx.period.id },
      include: { item: true },
    }),
    prisma.inventoryStockCard.groupBy({
      by: ["periodId"],
      where: ctx.siteWhere,
      _sum: { qtyIn: true, qtyOut: true, closingStock: true },
      _count: { _all: true },
    }),
    prisma.goodsIssue.groupBy({ by: ["periodId"], where: ctx.siteWhere, _count: { _all: true } }),
    prisma.purchaseRequest.groupBy({ by: ["periodId"], where: ctx.siteWhere, _count: { _all: true } }),
  ]);

  const creatorIds = Array.from(new Set(movementsRaw.map((m) => m.createdBy).filter(Boolean) as string[]));
  const users = creatorIds.length
    ? await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, name: true, role: true },
    })
    : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const movements = movementsRaw.map((m) => {
    const creator = m.createdBy ? userMap.get(m.createdBy) : null;
    return {
      id: m.id,
      createdAt: m.createdAt.toISOString(),
      type: m.type,
      qty: m.qty,
      balance: m.balance,
      refType: m.refType,
      refNo: m.refNo,
      note: m.note,
      photoUrl: m.photoUrl,
      siteId: m.siteId,
      item: {
        code: m.item.code,
        name: m.item.name,
        category: m.item.category,
        unit: m.item.unit,
      },
      user: creator ? { name: creator.name, role: creator.role } : null,
    };
  });

  const totalIn = movements.filter((m) => m.type === "IN").reduce((sum, m) => sum + m.qty, 0);
  const totalOut = movements.filter((m) => m.type === "OUT").reduce((sum, m) => sum + m.qty, 0);
  const totalAdj = movements.filter((m) => m.type === "ADJUST").length;

  // Rekap per kategori
  type Row = { key: string; cat: string; site: string; items: number; open: number; in: number; out: number; adj: number; close: number };
  const map = new Map<string, Row>();
  for (const c of cards) {
    const key = ctx.site === "ALL" ? `${c.siteId}|${c.item.category}` : c.item.category;
    const r = map.get(key) ?? { key, cat: c.item.category, site: c.siteId, items: 0, open: 0, in: 0, out: 0, adj: 0, close: 0 };
    r.items++;
    r.open += c.openingStock;
    r.in += c.qtyIn;
    r.out += c.qtyOut;
    r.adj += c.qtyAdjust;
    r.close += c.closingStock;
    map.set(key, r);
  }
  const rows = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  const tot = rows.reduce(
    (s, r) => ({
      open: s.open + r.open,
      in: s.in + r.in,
      out: s.out + r.out,
      adj: s.adj + r.adj,
      close: s.close + r.close,
    }),
    { open: 0, in: 0, out: 0, adj: 0, close: 0 }
  );

  const visiblePeriods = ctx.isAdmin ? ctx.periods : ctx.periods.filter((p) => p.isActive);

  return (
    <>
      <PageHeader
        ctx={ctx}
        title="Riwayat Transaksi"
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="text-xs font-medium text-slate-500 mb-1.5">Barang Masuk (In)</div>
            <div className="text-xl font-bold font-mono text-slate-900">+{num(totalIn)}</div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="text-xs font-medium text-slate-500 mb-1.5">Barang Keluar (Out)</div>
            <div className="text-xl font-bold font-mono text-slate-900">-{num(totalOut)}</div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="text-xs font-medium text-slate-500 mb-1.5">Adjustment Stok</div>
            <div className="text-xl font-bold font-mono text-slate-900">{totalAdj}</div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="text-xs font-medium text-slate-500 mb-1.5">Total Transaksi</div>
            <div className="text-xl font-bold font-mono text-slate-900">{movements.length}</div>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-blue-700" />
              <span>Daftar Riwayat Mutasi Stok</span>
            </h2>
          </div>

          <TransactionHistoryTable
            data={movements}
            site={ctx.site}
            periodName={ctx.period.periodName}
          />
        </section>

        <Panel
          title={`Rekap Kategori Stok - ${periodLabel(ctx.period.periodName)}${ctx.readOnly ? " (Arsip)" : ""
            }`}
          right={
            <div className="text-xs font-semibold text-slate-600">
              Total Akhir: <span className="font-bold text-slate-900">{num(tot.close)} item</span>
            </div>
          }
        >
          <div className={tableWrap + " !border-0"}>
            <table className={table}>
              <thead>
                <tr>
                  {ctx.site === "ALL" && <th className={th}>Site</th>}
                  <th className={th}>Kategori</th>
                  <th className={`${th} text-right`}>Jml Item</th>
                  <th className={`${th} text-right`}>Stok Awal</th>
                  <th className={`${th} text-right`}>Masuk</th>
                  <th className={`${th} text-right`}>Keluar</th>
                  <th className={`${th} text-right`}>Adj.</th>
                  <th className={`${th} text-right`}>Stok Akhir</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="group hover:bg-slate-50/70 transition-colors">
                    {ctx.site === "ALL" && <td className={td}>{siteLabel(r.site)}</td>}
                    <td className={td}>{categoryLabel(r.cat)}</td>
                    <td className={`${td} text-right font-mono text-slate-600`}>{r.items}</td>
                    <td className={`${td} text-right font-mono text-slate-600`}>{num(r.open)}</td>
                    <td className={`${td} text-right font-mono text-emerald-600 font-semibold`}>
                      +{num(r.in)}
                    </td>
                    <td className={`${td} text-right font-mono text-rose-600 font-semibold`}>
                      -{num(r.out)}
                    </td>
                    <td className={`${td} text-right font-mono text-slate-600`}>{num(r.adj)}</td>
                    <td className={`${td} text-right font-mono font-semibold text-slate-900`}>
                      {num(r.close)}
                    </td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr className="bg-slate-50/80 font-semibold text-slate-900 border-t-2 border-slate-200/80">
                    <td className={td} colSpan={ctx.site === "ALL" ? 3 : 2}>
                      Total
                    </td>
                    <td className={`${td} text-right font-mono text-slate-700`}>{num(tot.open)}</td>
                    <td className={`${td} text-right font-mono text-emerald-700 font-semibold`}>
                      +{num(tot.in)}
                    </td>
                    <td className={`${td} text-right font-mono text-rose-700 font-semibold`}>
                      -{num(tot.out)}
                    </td>
                    <td className={`${td} text-right font-mono text-slate-700`}>{num(tot.adj)}</td>
                    <td className={`${td} text-right font-mono font-bold text-slate-900`}>
                      {num(tot.close)}
                    </td>
                  </tr>
                )}
                {!rows.length && (
                  <Empty cols={8} text="Tidak ada data kartu stok pada periode ini." />
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Daftar Periode Akuntansi (Cut-off)">
          <div className={tableWrap + " !border-0"}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>Periode</th>
                  <th className={th}>Mulai</th>
                  <th className={th}>Selesai</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Kartu Stok</th>
                  <th className={`${th} text-right`}>Masuk</th>
                  <th className={`${th} text-right`}>Keluar</th>
                  <th className={`${th} text-right`}>Transaksi GI</th>
                  <th className={`${th} text-right`}>PR</th>
                </tr>
              </thead>
              <tbody>
                {visiblePeriods.map((p) => {
                  const s = allCards.find((x) => x.periodId === p.id);
                  return (
                    <tr key={p.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className={`${td} font-mono font-medium text-slate-900`}>
                        {p.periodName}{" "}
                        <span className="font-sans text-xs text-slate-400 font-normal">
                          ({periodLabel(p.periodName)})
                        </span>
                      </td>
                      <td className={`${td} font-mono text-xs text-slate-500`}>
                        {fmtDate(p.startDate)}
                      </td>
                      <td className={`${td} font-mono text-xs text-slate-500`}>
                        {fmtDate(p.endDate)}
                      </td>
                      <td className={td}>
                        {p.isActive ? (
                          <Badge tone="green">Aktif</Badge>
                        ) : (
                          <Badge tone="slate">Closed</Badge>
                        )}
                      </td>
                      <td className={`${td} text-right font-mono text-slate-700`}>
                        {s?._count._all ?? 0}
                      </td>
                      <td className={`${td} text-right font-mono text-slate-700`}>
                        {num(s?._sum.qtyIn ?? 0)}
                      </td>
                      <td className={`${td} text-right font-mono text-slate-700`}>
                        {num(s?._sum.qtyOut ?? 0)}
                      </td>
                      <td className={`${td} text-right font-mono text-slate-700`}>
                        {issues.find((x) => x.periodId === p.id)?._count._all ?? 0}
                      </td>
                      <td className={`${td} text-right font-mono text-slate-700`}>
                        {prs.find((x) => x.periodId === p.id)?._count._all ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
