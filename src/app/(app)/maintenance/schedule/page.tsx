import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader, Panel } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { RowActionMenu } from "@/components/row-action-menu";
import { CheckCircle2, FastForward } from "lucide-react";
import { Empty, Field, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { assetCategoryLabel, siteLabel } from "@/lib/constants";
import { daysBetween, fmtDate } from "@/lib/format";
import { completeRoutine, skipRoutine, updateSchedule } from "@/actions/maintenance";

export default async function SchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);
  const today = new Date();
  const canEdit = ctx.isAdmin && !ctx.readOnly;

  const [tickets, assets] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where: {
        ...ctx.siteWhere,
        type: "PREVENTIVE",
        OR: [
          { dueDate: { gte: ctx.period.startDate, lte: ctx.period.endDate } },
          ...(ctx.period.isActive ? [{ status: "Upcoming" }] : []),
        ],
      },
      include: { asset: true },
      orderBy: [{ status: "desc" }, { dueDate: "asc" }],
    }),
    prisma.asset.findMany({ where: { ...ctx.siteWhere, isActive: true }, orderBy: [{ siteId: "asc" }, { nextDueDate: "asc" }] }),
  ]);

  return (
    <>
      <PageHeader
        ctx={ctx}
        sp={sp}
        title="Jadwal Perbaikan"
      />

      <div className="space-y-4">
        <Panel title="Tiket Maintenance Rutin">
          <div className={tableWrap + " !border-0"}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={`${th} ${stickyTh}`}>Aset</th><th className={th}>No. Tiket</th><th className={th}>Kategori</th>
                  {ctx.site === "ALL" && <th className={th}>Site</th>}
                  <th className={th}>Jatuh Tempo</th><th className={th}>Catatan Sistem</th><th className={th}>Status</th>
                  <th className={th}>Keterangan</th>{canEdit && <th className={th}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const left = t.dueDate ? daysBetween(today, t.dueDate) : 0;
                  const last = t.asset.lastServiceDate;
                  const ago = last ? daysBetween(last, today) : null;
                  const open = t.status === "Upcoming";
                  return (
                    <tr key={t.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className={`${td} ${stickyTd}`}>
                        <div className="font-semibold text-slate-900">{t.asset.name}</div>
                        <div className="font-mono text-xs font-normal text-slate-400 mt-0.5">{t.asset.code}</div>
                      </td>
                      <td className={`${td} font-mono text-xs font-semibold text-slate-800`}>{t.number}</td>
                      <td className={td}>{assetCategoryLabel(t.asset.category)}</td>
                      {ctx.site === "ALL" && <td className={td}>{siteLabel(t.siteId)}</td>}
                      <td className={`${td} font-mono text-xs text-slate-700`}>
                        <div>{fmtDate(t.dueDate)}</div>
                        {open && <div className={`text-xs mt-0.5 ${left < 0 ? "text-rose-600 font-semibold" : "text-amber-600 font-medium"}`}>{left < 0 ? `terlambat ${-left} hari` : left === 0 ? "hari ini" : `H-${left}`}</div>}
                      </td>
                      <td className={`${td} max-w-64 text-xs text-slate-500 leading-relaxed`}>
                        {last ? `Terakhir servis: ${fmtDate(last)} (${ago} hr lalu).` : "Belum ada riwayat servis."}
                      </td>
                      <td className={td}>{open && left < 0 ? <StatusBadge status="Overdue" /> : <StatusBadge status={t.status} />}</td>
                      <td className={`${td} max-w-60 text-xs text-slate-600`}>{t.skipReason ? `Skip: ${t.skipReason}` : t.resolution ?? "-"}</td>
                      {canEdit && (
                        <td className={td}>
                          {open ? (
                            <RowActionMenu>
                              <FormDialog
                                title={`Selesaikan ${t.number}`}
                                trigger={
                                  <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                                    <span>Selesaikan Maintenance</span>
                                  </div>
                                }
                              >
                                <form action={completeRoutine} className="grid gap-3">
                                  <input type="hidden" name="id" value={t.id} />
                                  <Field label="Catatan Pekerjaan">
                                    <textarea
                                      name="resolution"
                                      rows={3}
                                      className={`${inputCls} !h-auto py-2`}
                                      placeholder="Uraikan pekerjaan servis yang dilakukan..."
                                    />
                                  </Field>
                                  <div className="pt-2"><button className={btnPrimary}>Selesaikan Maintenance</button></div>
                                </form>
                              </FormDialog>

                              <FormDialog
                                title={`Skip ${t.number}`}
                                trigger={
                                  <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors">
                                    <FastForward className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                    <span>Skip Jadwal Ini</span>
                                  </div>
                                }
                              >
                                <form action={skipRoutine} className="grid gap-3">
                                  <input type="hidden" name="id" value={t.id} />
                                  <p className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 leading-relaxed font-medium">
                                    Catatan Sistem: {last ? `Aset ini terakhir kali diservis/diperbaiki pada ${fmtDate(last)} (${ago} hari yang lalu).` : "Belum ada riwayat servis."}
                                  </p>
                                  <Field label="Alasan / Keterangan Skip (wajib)">
                                    <textarea
                                      name="reason"
                                      required
                                      minLength={5}
                                      rows={3}
                                      placeholder="Contoh: Di-skip karena sudah dilakukan servis & ganti oli 5 hari yang lalu"
                                      className={`${inputCls} !h-auto py-2`}
                                    />
                                  </Field>
                                  <div className="pt-2"><button className={btnDanger}>Skip Jadwal Ini</button></div>
                                </form>
                              </FormDialog>
                            </RowActionMenu>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {!tickets.length && <Empty cols={9} text="Tidak ada tiket rutin. Tiket baru muncul H-7 sebelum jatuh tempo." />}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Pengaturan Jadwal per Aset">
          <div className={tableWrap + " !border-0"}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={`${th} ${stickyTh}`}>Aset</th><th className={th}>Kategori</th>
                  {ctx.site === "ALL" && <th className={th}>Site</th>}
                  <th className={th}>Jadwal</th><th className={th}>Berikutnya</th><th className={th}>Last Service</th>{canEdit && <th className={th}>Ubah</th>}
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className={`${td} ${stickyTd}`}>
                      <div className="font-semibold text-slate-900">{a.name}</div>
                      <div className="font-mono text-xs font-normal text-slate-400 mt-0.5">{a.code}</div>
                    </td>
                    <td className={td}>{assetCategoryLabel(a.category)}</td>
                    {ctx.site === "ALL" && <td className={td}>{siteLabel(a.siteId)}</td>}
                    <td className={`${td} text-slate-600`}>Setiap {a.intervalMonths} bulan, tgl {a.scheduleDay}</td>
                    <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(a.nextDueDate)}</td>
                    <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(a.lastServiceDate)}</td>
                    {canEdit && (
                      <td className={td}>
                        <form action={updateSchedule} className="flex items-center gap-1.5">
                          <input type="hidden" name="id" value={a.id} />
                          <input name="intervalMonths" type="number" min={1} max={24} defaultValue={a.intervalMonths} aria-label="Interval bulan" className={`${inputCls} !h-8 !w-16 font-mono text-center`} />
                          <span className="text-xs text-slate-500">bln, tgl</span>
                          <input name="scheduleDay" type="number" min={1} max={31} defaultValue={a.scheduleDay} aria-label="Tanggal" className={`${inputCls} !h-8 !w-16 font-mono text-center`} />
                          <button className={`${btnSecondary} !h-8 !px-3 !text-xs`}>Simpan</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
                {!assets.length && <Empty cols={7} />}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
