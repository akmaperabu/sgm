import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { RowActionMenu } from "@/components/row-action-menu";
import { Badge, Empty, Field, StatusBadge, btnDanger, btnPrimary, inputCls, selectCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { URGENCIES, assetCategoryLabel, siteLabel } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { handleRepair, requestRepair } from "@/actions/maintenance";
import { Camera, CheckCircle2, Wrench, XCircle } from "lucide-react";
import { ImageUploadInput } from "@/components/image-upload-input";

const urgTone = { Low: "slate", Medium: "blue", High: "amber", Critical: "red" } as const;

export default async function RepairRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);

  const tickets = await prisma.maintenanceTicket.findMany({
    where: {
      ...ctx.siteWhere,
      type: "CORRECTIVE",
      OR: [
        { createdAt: { gte: ctx.period.startDate, lte: ctx.period.endDate } },
        ...(ctx.period.isActive ? [{ status: { in: ["Open", "In Progress"] } }] : []),
      ],
    },
    include: { asset: true, requester: true },
    orderBy: { createdAt: "desc" },
  });
  const canEdit = ctx.isAdmin && !ctx.readOnly;
  const assets = ctx.readOnly
    ? []
    : await prisma.asset.findMany({
        where: { ...ctx.siteWhere, isActive: true },
        orderBy: [{ siteId: "asc" }, { category: "asc" }, { code: "asc" }],
      });

  return (
    <>
      <PageHeader
        ctx={ctx}
        sp={sp}
        title="Request Perbaikan"
        actions={
          !ctx.readOnly ? (
            <FormDialog label="Request Perbaikan" title="Laporkan Kerusakan">
              <form action={requestRepair} className="grid gap-3.5">
                <Field label="Aset">
                  {assets.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Belum ada aset mesin / unit terdaftar di site ini.
                    </div>
                  ) : (
                    <select name="assetId" required defaultValue="" className={selectCls}>
                      <option value="" disabled>- Pilih aset yang rusak -</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {assetCategoryLabel(a.category)} - {a.code} {a.name}{ctx.site === "ALL" ? ` [${siteLabel(a.siteId)}]` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Tingkat Urgensi">
                  <select name="urgency" defaultValue="Medium" className={selectCls}>
                    {URGENCIES.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Deskripsi Kerusakan"><textarea name="description" required rows={3} className={`${inputCls} !h-auto py-2`} placeholder="Jelaskan detail gejala kerusakan..." /></Field>
                <ImageUploadInput name="photo" label="Foto Kerusakan (Opsional)" />
                <div className="pt-2"><button disabled={assets.length === 0} className={btnPrimary}>Kirim Request</button></div>
              </form>
            </FormDialog>
          ) : null
        }
      />

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} ${stickyTh}`}>Aset</th><th className={th}>No. Tiket</th><th className={th}>Kategori</th>
              {ctx.site === "ALL" && <th className={th}>Site</th>}
              <th className={th}>Tgl</th><th className={th}>Urgensi</th><th className={th}>Deskripsi</th><th className={th}>Pemohon</th>
              <th className={th}>Status</th><th className={th}>Selesai</th>
              {canEdit && <th className={th}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="group hover:bg-slate-50/70 transition-colors">
                <td className={`${td} ${stickyTd}`}>
                  <div className="font-semibold text-slate-900">{t.asset.name}</div>
                  <div className="font-mono text-xs font-normal text-slate-400 mt-0.5">{t.asset.code}</div>
                </td>
                <td className={`${td} font-mono text-xs font-semibold text-slate-800`}>{t.number}</td>
                <td className={td}>{assetCategoryLabel(t.asset.category)}</td>
                {ctx.site === "ALL" && <td className={td}>{siteLabel(t.siteId)}</td>}
                <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(t.createdAt)}</td>
                <td className={td}>{t.urgency && <Badge tone={urgTone[t.urgency as keyof typeof urgTone]}>{t.urgency}</Badge>}</td>
                <td className={`${td} max-w-72`}>
                  <div className="text-slate-800 leading-relaxed">{t.description}</div>
                  {t.photoUrl && (
                    <a
                      href={t.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Camera className="h-3 w-3" />
                      <span>Lihat Foto Kerusakan</span>
                    </a>
                  )}
                  {t.resolution && <div className="text-xs text-slate-500 mt-1">Hasil: {t.resolution}</div>}
                </td>
                <td className={td}>{t.requester?.name ?? "-"}</td>
                <td className={td}><StatusBadge status={t.status} /></td>
                <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(t.completedAt)}</td>
                {canEdit && (
                  <td className={td}>
                    {["Open", "In Progress"].includes(t.status) ? (
                      <RowActionMenu>
                        {t.status === "Open" && (
                          <form action={handleRepair} className="w-full">
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="step" value="progress" />
                            <button
                              type="submit"
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                            >
                              <Wrench className="h-3.5 w-3.5 shrink-0" />
                              <span>Mulai Kerjakan</span>
                            </button>
                          </form>
                        )}

                        <FormDialog
                          title={`Tutup Tiket ${t.number}`}
                          trigger={
                            <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span>Selesaikan Perbaikan</span>
                            </div>
                          }
                        >
                          <form action={handleRepair} className="grid gap-3">
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="step" value="complete" />
                            <Field label="Hasil Perbaikan">
                              <textarea
                                name="resolution"
                                rows={3}
                                required
                                placeholder="Uraikan perbaikan yang telah dilakukan..."
                                className={`${inputCls} !h-auto py-2`}
                              />
                            </Field>
                            <p className="text-xs text-slate-500">Tanggal selesai disimpan sebagai last service aset. Jadwal rutin tidak berubah.</p>
                            <div><button className={btnPrimary}>Tandai Completed</button></div>
                          </form>
                        </FormDialog>

                        {t.status === "Open" && (
                          <FormDialog
                            title={`Tolak ${t.number}`}
                            trigger={
                              <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors">
                                <XCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>Tolak Tiket</span>
                              </div>
                            }
                          >
                            <form action={handleRepair} className="grid gap-3">
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="step" value="reject" />
                              <Field label="Alasan Penolakan"><input name="note" required className={inputCls} placeholder="Contoh: Bukan kerusakan aset / salah input" /></Field>
                              <div><button className={btnDanger}>Tolak Tiket</button></div>
                            </form>
                          </FormDialog>
                        )}
                      </RowActionMenu>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!tickets.length && <Empty cols={11} text="Belum ada request perbaikan." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
