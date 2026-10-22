import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { RowActionMenu } from "@/components/row-action-menu";
import { Badge, Empty, Field, btnDanger, btnPrimary, btnSecondary, inputCls, selectCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { ASSET_CATEGORIES, SITES, assetCategoryLabel, siteLabel } from "@/lib/constants";
import { daysBetween, fmtDate } from "@/lib/format";
import { saveAsset, toggleAsset } from "@/actions/maintenance";
import { Pencil, Power } from "lucide-react";
import Link from "next/link";

export default async function AssetsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);
  const today = new Date();

  const assets = await prisma.asset.findMany({
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
  });

  return (
    <>
      <PageHeader
        ctx={ctx}
        sp={sp}
        showPeriod={false}
        title="Master Aset"
        actions={
          ctx.isAdmin ? (
            <FormDialog label="Tambah Aset" title="Tambah Aset">
              <form action={saveAsset} className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Site">
                  <select name="siteId" defaultValue={ctx.writeSite} className={selectCls}>
                    {SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Kode Aset"><input name="code" required className={`${inputCls} font-mono uppercase`} placeholder="TRK-03" /></Field>
                <div className="sm:col-span-2"><Field label="Nama Aset"><input name="name" required className={inputCls} placeholder="cth: Kompresor Utama Oxygen" /></Field></div>
                <Field label="Kategori">
                  <select name="category" className={selectCls}>
                    {ASSET_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Interval (bulan)"><input name="intervalMonths" type="number" min={1} max={24} defaultValue={1} required className={`${inputCls} font-mono`} /></Field>
                  <Field label="Tanggal tetap"><input name="scheduleDay" type="number" min={1} max={31} defaultValue={15} required className={`${inputCls} font-mono`} /></Field>
                </div>
                <div className="sm:col-span-2 pt-2"><button className={btnPrimary}>Simpan Aset</button></div>
              </form>
            </FormDialog>
          ) : null
        }
      />
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} ${stickyTh}`}>Aset</th>
              <th className={th}>Kode</th>
              <th className={th}>Kategori</th>
              {ctx.site === "ALL" && <th className={th}>Site</th>}
              <th className={th}>Kondisi Operasional</th>
              <th className={th}>Jadwal Rutin</th>
              <th className={th}>Jatuh Tempo Berikut</th>
              <th className={th}>Servis Terakhir</th>
              <th className={`${th} text-right`}>Perbaikan</th>
              {ctx.isAdmin && <th className={th}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const activeRepair = a.tickets.find((t) => t.type === "CORRECTIVE");
              const activeRoutine = a.tickets.find((t) => t.type === "PREVENTIVE");
              const daysLeft = activeRoutine?.dueDate ? daysBetween(today, activeRoutine.dueDate) : null;
              const isOverdue = daysLeft !== null && daysLeft < 0;
              const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
              const breakdownCount = a._count.tickets;

              return (
                <tr key={a.id} className={`group hover:bg-slate-50/70 transition-colors ${a.isActive ? "" : "opacity-60"}`}>
                  <td className={`${td} ${stickyTd}`}>
                    <div className="font-semibold text-slate-900">{a.name}</div>
                    <div className="font-mono text-xs text-slate-400 mt-0.5">{a.code}</div>
                  </td>
                  <td className={`${td} font-mono text-xs text-slate-500`}>{a.code}</td>
                  <td className={td}>{assetCategoryLabel(a.category)}</td>
                  {ctx.site === "ALL" && <td className={td}>{siteLabel(a.siteId)}</td>}
                  <td className={td}>
                    {!a.isActive ? (
                      <Badge tone="slate" dot={false}>Nonaktif</Badge>
                    ) : activeRepair ? (
                      <Link href="/maintenance/requests" className="hover:opacity-80 transition-opacity">
                        <Badge tone="red" dot>Dalam Perbaikan</Badge>
                      </Link>
                    ) : isOverdue ? (
                      <Link href="/maintenance/schedule" className="hover:opacity-80 transition-opacity">
                        <Badge tone="red" dot>Servis Terlambat</Badge>
                      </Link>
                    ) : isDueSoon ? (
                      <Link href="/maintenance/schedule" className="hover:opacity-80 transition-opacity">
                        <Badge tone="amber" dot>{daysLeft === 0 ? "Servis Hari Ini" : `Jatuh Tempo H-${daysLeft}`}</Badge>
                      </Link>
                    ) : (
                      <Badge tone="green" dot>Normal / Ready</Badge>
                    )}
                  </td>
                  <td className={`${td} text-slate-600`}>Tiap {a.intervalMonths} bln, tgl {a.scheduleDay}</td>
                  <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(a.nextDueDate)}</td>
                  <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(a.lastServiceDate)}</td>
                  <td className={`${td} text-right font-mono text-xs text-slate-700`}>
                    {breakdownCount > 0 ? `${breakdownCount}x` : <span className="text-slate-300">-</span>}
                  </td>
                  {ctx.isAdmin && (
                    <td className={td}>
                      <RowActionMenu>
                        <FormDialog
                          title={`Edit ${a.code}`}
                          trigger={
                            <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                              <Pencil className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              <span>Edit Aset</span>
                            </div>
                          }
                        >
                          <form action={saveAsset} className="grid gap-3.5">
                            <input type="hidden" name="id" value={a.id} />
                            <Field label="Nama Aset"><input name="name" required defaultValue={a.name} className={inputCls} /></Field>
                            <Field label="Kategori">
                              <select name="category" defaultValue={a.category} className={selectCls}>
                                {ASSET_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                              </select>
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                              <Field label="Interval (bulan)">
                                <input name="intervalMonths" type="number" min={1} max={24} defaultValue={a.intervalMonths} required className={`${inputCls} font-mono`} />
                              </Field>
                              <Field label="Tanggal tetap">
                                <input name="scheduleDay" type="number" min={1} max={31} defaultValue={a.scheduleDay} required className={`${inputCls} font-mono`} />
                              </Field>
                            </div>
                            <div className="pt-2"><button className={btnPrimary}>Simpan</button></div>
                          </form>
                        </FormDialog>

                        <form action={toggleAsset} className="w-full">
                          <input type="hidden" name="id" value={a.id} />
                          <button
                            type="submit"
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                              a.isActive
                                ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                            }`}
                          >
                            <Power className="h-3.5 w-3.5 shrink-0" />
                            <span>{a.isActive ? "Nonaktifkan Aset" : "Aktifkan Aset"}</span>
                          </button>
                        </form>
                      </RowActionMenu>
                    </td>
                  )}
                </tr>
              );
            })}
            {!assets.length && <Empty cols={10} text="Belum ada aset terdaftar." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
