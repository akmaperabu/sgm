import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { ViewDetailDialog, DetailSection, DetailItem } from "@/components/view-detail-dialog";
import { RowActionMenu } from "@/components/row-action-menu";
import { Badge, Empty, Field, StatusBadge, btnDanger, btnPrimary, inputCls, selectCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { URGENCIES, assetCategoryLabel, siteLabel } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { handleRepair, requestRepair } from "@/actions/maintenance";
import { getCachedActiveAssets } from "@/lib/cache";
import { Camera, CheckCircle2, Wrench, XCircle, Eye } from "lucide-react";
import { ImageUploadInput } from "@/components/image-upload-input";
import { ImagePreviewDialog } from "@/components/image-preview-dialog";

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
    include: {
      asset: true,
      requester: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const canEdit = ctx.isAdmin && !ctx.readOnly;
  const assets = ctx.readOnly ? [] : await getCachedActiveAssets(ctx.site);

  return (
    <>
      <PageHeader
        ctx={ctx}
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
                    {URGENCIES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Deskripsi Kerusakan">
                  <textarea
                    name="description"
                    required
                    rows={3}
                    placeholder="Jelaskan kendala/kerusakan yang terjadi secara detail..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                  />
                </Field>
                <ImageUploadInput label="Foto Kerusakan (opsional)" name="photo" />
                <div className="pt-2">
                  <button disabled={assets.length === 0} className={btnPrimary}>Kirim Request</button>
                </div>
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
              <th className={th}>No. Tiket</th>
              <th className={th}>Kategori</th>
              {ctx.site === "ALL" && <th className={th}>Site</th>}
              <th className={th}>Tanggal</th>
              <th className={th}>Urgensi</th>
              <th className={th}>Kerusakan</th>
              <th className={th}>Pelapor</th>
              <th className={th}>Status</th>
              <th className={th}>Selesai</th>
              <th className={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const detailContent = (
                <div className="space-y-3.5">
                  <DetailSection title="Rincian Tiket Perbaikan">
                    <DetailItem label="Nomor Tiket" value={<span className="font-mono font-bold text-slate-900">{t.number}</span>} />
                    <DetailItem label="Tanggal Laporan" value={fmtDateTime(t.createdAt)} />
                    <DetailItem label="Status Tiket" value={<StatusBadge status={t.status} />} />
                    <DetailItem
                      label="Tingkat Urgensi"
                      value={t.urgency ? <Badge tone={urgTone[t.urgency as keyof typeof urgTone]}>{t.urgency}</Badge> : "-"}
                    />
                    <DetailItem label="Pelapor Kerusakan" value={t.requester?.name ?? "-"} />
                    <DetailItem label="Site Penempatan" value={siteLabel(t.siteId)} />
                    <DetailItem label="Deskripsi Kerusakan" value={t.description || "-"} span2 />
                    {t.photoUrl && (
                      <DetailItem
                        label="Dokumentasi Kerusakan"
                        value={
                          <ImagePreviewDialog
                            src={t.photoUrl}
                            title={`Foto Kerusakan: ${t.number}`}
                            trigger={
                              <span className="inline-flex items-center gap-1 text-blue-700 underline font-medium">
                                <Camera className="h-3.5 w-3.5" /> Lihat Foto Kerusakan
                              </span>
                            }
                          />
                        }
                        span2
                      />
                    )}
                  </DetailSection>

                  <DetailSection title="Informasi Aset Terkait">
                    <DetailItem label="Nama Aset Mesin/Unit" value={t.asset.name} highlight span2 />
                    <DetailItem label="Kode Aset" value={<span className="font-mono text-xs">{t.asset.code}</span>} />
                    <DetailItem label="Kategori" value={assetCategoryLabel(t.asset.category)} />
                  </DetailSection>

                  <DetailSection title="Hasil Penyelesaian / Tindakan">
                    <DetailItem label="Tanggal Selesai" value={t.completedAt ? fmtDateTime(t.completedAt) : "-"} />
                    <DetailItem label="Uraian Perbaikan / Solusi" value={t.resolution || "-"} span2 />
                  </DetailSection>
                </div>
              );

              return (
                <tr key={t.id} className="group hover:bg-slate-50/70 transition-colors">
                  <td className={`${td} ${stickyTd}`}>
                    <ViewDetailDialog
                      title={`Detail Perbaikan: ${t.number}`}
                      subtitle={`${t.asset.name} • ${siteLabel(t.siteId)}`}
                      trigger={
                        <div className="text-left group/item cursor-pointer">
                          <div className="font-semibold text-slate-900 group-hover/item:text-blue-700 transition-colors underline-offset-2 hover:underline">
                            {t.asset.name}
                          </div>
                          <div className="font-mono text-xs font-normal text-slate-400 mt-0.5">{t.asset.code}</div>
                        </div>
                      }
                    >
                      {detailContent}
                    </ViewDetailDialog>
                  </td>
                  <td className={`${td} font-mono text-xs font-semibold text-slate-800`}>{t.number}</td>
                  <td className={td}>{assetCategoryLabel(t.asset.category)}</td>
                  {ctx.site === "ALL" && <td className={td}>{siteLabel(t.siteId)}</td>}
                  <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(t.createdAt)}</td>
                  <td className={td}>{t.urgency && <Badge tone={urgTone[t.urgency as keyof typeof urgTone]}>{t.urgency}</Badge>}</td>
                  <td className={`${td} max-w-72`}>
                    <div className="text-slate-800 leading-relaxed">{t.description}</div>
                    {t.photoUrl && (
                      <div className="mt-1.5">
                        <ImagePreviewDialog
                          src={t.photoUrl}
                          title={`Foto Kerusakan: ${t.number}`}
                          trigger={
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-slate-50 transition-colors shadow-2xs">
                              <Camera className="h-3 w-3" />
                              <span>Lihat Foto Kerusakan</span>
                            </span>
                          }
                        />
                      </div>
                    )}
                    {t.resolution && <div className="text-xs text-slate-500 mt-1">Hasil: {t.resolution}</div>}
                  </td>
                  <td className={td}>{t.requester?.name ?? "-"}</td>
                  <td className={td}><StatusBadge status={t.status} /></td>
                  <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(t.completedAt)}</td>
                  <td className={td}>
                    <RowActionMenu>
                      <ViewDetailDialog
                        title={`Detail Perbaikan: ${t.number}`}
                        subtitle={`${t.asset.name} • ${siteLabel(t.siteId)}`}
                        trigger={
                          <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                            <Eye className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>Lihat Detail</span>
                          </div>
                        }
                      >
                        {detailContent}
                      </ViewDetailDialog>

                      {canEdit && ["Open", "In Progress"].includes(t.status) && (
                        <>
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
                        </>
                      )}
                    </RowActionMenu>
                  </td>
                </tr>
              );
            })}
            {!tickets.length && <Empty cols={11} text="Belum ada tiket perbaikan pada periode ini." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
