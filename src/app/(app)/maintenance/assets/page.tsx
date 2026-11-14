import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { ViewDetailDialog, DetailSection, DetailItem } from "@/components/view-detail-dialog";
import { RowActionMenu } from "@/components/row-action-menu";
import { Badge, Empty, Field, btnPrimary, inputCls, selectCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { ASSET_CATEGORIES, SITES, assetCategoryLabel, siteLabel } from "@/lib/constants";
import { daysBetween, fmtDate, getAssetLifespanInfo } from "@/lib/format";
import { recordCalibrationOrExtension, saveAsset, toggleAsset } from "@/actions/maintenance";
import { Eye, Pencil, Power, ShieldCheck } from "lucide-react";
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
        select: { id: true, number: true, type: true, status: true, dueDate: true, createdAt: true },
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
                <Field label="Mulai Pakai / Beli">
                  <input name="purchaseDate" type="date" className={`${inputCls} font-mono`} />
                </Field>
                <Field label="Target Masa Pakai (bln)">
                  <input name="lifespanMonths" type="number" min={1} placeholder="cth: 60 (5 tahun)" className={`${inputCls} font-mono`} />
                </Field>
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
              <th className={th}>Usia & Masa Pakai</th>
              <th className={th}>Jadwal Rutin</th>
              <th className={th}>Jatuh Tempo Berikut</th>
              <th className={th}>Servis Terakhir</th>
              <th className={`${th} text-right`}>Perbaikan</th>
              <th className={th}>Aksi</th>
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
              const life = getAssetLifespanInfo(a.purchaseDate, a.lifespanMonths, a.extendedMonths, today);

              const detailModalContent = (
                <div className="space-y-3.5">
                  <DetailSection title="Informasi Pokok Aset">
                    <DetailItem label="Nama Aset" value={a.name} highlight span2 />
                    <DetailItem label="Kode Aset" value={<span className="font-mono text-xs">{a.code}</span>} />
                    <DetailItem label="Kategori" value={assetCategoryLabel(a.category)} />
                    <DetailItem label="Site Penempatan" value={siteLabel(a.siteId)} />
                    <DetailItem
                      label="Status Unit"
                      value={
                        a.isActive ? (
                          <Badge tone="green" dot>Aktif Beroperasi</Badge>
                        ) : (
                          <Badge tone="slate" dot={false}>Nonaktif</Badge>
                        )
                      }
                    />
                    <DetailItem
                      label="Kondisi Terkini"
                      value={
                        !a.isActive ? (
                          <Badge tone="slate" dot={false}>Nonaktif</Badge>
                        ) : activeRepair ? (
                          <Badge tone="red" dot>Dalam Perbaikan</Badge>
                        ) : isOverdue ? (
                          <Badge tone="red" dot>Servis Terlambat</Badge>
                        ) : isDueSoon ? (
                          <Badge tone="amber" dot>Mendekati Jatuh Tempo</Badge>
                        ) : (
                          <Badge tone="green" dot>Normal / Ready</Badge>
                        )
                      }
                      span2
                    />
                  </DetailSection>

                  <DetailSection title="Pemantauan Usia & Masa Pakai">
                    <DetailItem label="Tanggal Mulai Operasional" value={fmtDate(a.purchaseDate)} />
                    <DetailItem label="Usia Berjalan Saat Ini" value={life?.ageLabel ?? "-"} highlight />
                    <DetailItem
                      label="Target Masa Pakai Awal"
                      value={a.lifespanMonths ? `${a.lifespanMonths} Bulan (${Math.round(a.lifespanMonths / 12)} Thn)` : "Belum ditentukan"}
                    />
                    <DetailItem
                      label="Tambahan Rekondisi/Kalibrasi"
                      value={a.extendedMonths > 0 ? `+${a.extendedMonths} Bulan` : "Belum ada"}
                    />
                    {life?.hasTarget && (
                      <DetailItem
                        label="Status & Sisa Masa Pakai"
                        value={
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold">{life.remainingLabel}</span>
                              {life.status === "OVERDUE" ? (
                                <Badge tone="red" dot={false}>Perlu Rekondisi</Badge>
                              ) : life.status === "WARNING" ? (
                                <Badge tone="amber" dot={false}>Mendekati Batas</Badge>
                              ) : (
                                <Badge tone="green" dot={false}>Prima</Badge>
                              )}
                            </div>
                            <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full transition-all ${life.status === "OVERDUE"
                                    ? "bg-rose-500"
                                    : life.status === "WARNING"
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                style={{ width: `${Math.min(100, life.percentUsed ?? 0)}%` }}
                              />
                            </div>
                          </div>
                        }
                        span2
                      />
                    )}
                  </DetailSection>

                  <DetailSection title="Kalibrasi & Uji Akurasi Terakhir">
                    <DetailItem label="Tanggal Kalibrasi / Uji" value={fmtDate(a.lastCalibrationDate)} />
                    <DetailItem
                      label="Catatan / No. Sertifikat"
                      value={a.calibrationNotes || "Belum ada catatan kalibrasi"}
                      span2
                    />
                  </DetailSection>

                  <DetailSection title="Jadwal Perawatan Rutin (Preventive)">
                    <DetailItem label="Siklus Rutin" value={`Tiap ${a.intervalMonths} bulan (tgl ${a.scheduleDay})`} />
                    <DetailItem label="Jatuh Tempo Berikut" value={<span className="font-mono">{fmtDate(a.nextDueDate)}</span>} />
                    <DetailItem label="Terakhir Servis Rutin" value={<span className="font-mono">{fmtDate(a.lastServiceDate)}</span>} />
                    <DetailItem label="Total Tiket Kerusakan" value={`${breakdownCount} kali perbaikan`} />
                  </DetailSection>
                </div>
              );

              return (
                <tr key={a.id} className={`group hover:bg-slate-50/70 transition-colors ${a.isActive ? "" : "opacity-60"}`}>
                  <td className={`${td} ${stickyTd}`}>
                    <ViewDetailDialog
                      title={`Detail Aset: ${a.name}`}
                      subtitle={`${a.code} • ${siteLabel(a.siteId)}`}
                      trigger={
                        <div className="text-left group/item">
                          <div className="font-semibold text-slate-900 group-hover/item:text-blue-700 transition-colors underline-offset-2 hover:underline">
                            {a.name}
                          </div>
                          <div className="font-mono text-xs text-slate-400 mt-0.5">{a.code}</div>
                        </div>
                      }
                    >
                      {detailModalContent}
                    </ViewDetailDialog>
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
                  <td className={td}>
                    {life ? (
                      <div className="space-y-1 min-w-[140px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900">{life.ageLabel}</span>
                          {life.status === "OVERDUE" ? (
                            <Badge tone="red" dot={false}>Perlu Rekondisi</Badge>
                          ) : life.status === "WARNING" ? (
                            <Badge tone="amber" dot={false}>Mendekati Batas</Badge>
                          ) : life.hasTarget ? (
                            <Badge tone="green" dot={false}>Prima</Badge>
                          ) : null}
                        </div>
                        {life.hasTarget && (
                          <div className="space-y-0.5">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all ${life.status === "OVERDUE"
                                    ? "bg-rose-500"
                                    : life.status === "WARNING"
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                style={{ width: `${Math.min(100, life.percentUsed ?? 0)}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {life.remainingLabel}
                            </div>
                          </div>
                        )}
                        {a.lastCalibrationDate && (
                          <div className="text-[10.5px] text-emerald-700 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 inline shrink-0" />
                            <span>Kalibrasi: {fmtDate(a.lastCalibrationDate)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Belum diisi</span>
                    )}
                  </td>
                  <td className={`${td} text-slate-600`}>Tiap {a.intervalMonths} bln, tgl {a.scheduleDay}</td>
                  <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(a.nextDueDate)}</td>
                  <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(a.lastServiceDate)}</td>
                  <td className={`${td} text-right font-mono text-xs text-slate-700`}>
                    {breakdownCount > 0 ? `${breakdownCount}x` : <span className="text-slate-300">-</span>}
                  </td>
                  <td className={td}>
                    <RowActionMenu>
                      <ViewDetailDialog
                        title={`Detail Aset: ${a.name}`}
                        subtitle={`${a.code} • ${siteLabel(a.siteId)}`}
                        trigger={
                          <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                            <Eye className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>Lihat Detail</span>
                          </div>
                        }
                      >
                        {detailModalContent}
                      </ViewDetailDialog>

                      {ctx.isAdmin && (
                        <>
                          <FormDialog
                            title={`Kalibrasi / Rekondisi ${a.code}`}
                            trigger={
                              <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>Rekondisi / Kalibrasi</span>
                              </div>
                            }
                          >
                            <form action={recordCalibrationOrExtension} className="grid gap-3.5">
                              <input type="hidden" name="id" value={a.id} />
                              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600 space-y-1">
                                <div className="font-semibold text-slate-800">{a.name} ({a.code})</div>
                                <div>Usia saat ini: <span className="font-medium text-slate-700">{life?.ageLabel ?? "-"}</span></div>
                                {a.extendedMonths > 0 && (
                                  <div className="text-emerald-700 font-medium">Telah diperpanjang: +{a.extendedMonths} bulan</div>
                                )}
                                {a.lastCalibrationDate && (
                                  <div className="text-slate-500">Kalibrasi terakhir: {fmtDate(a.lastCalibrationDate)}</div>
                                )}
                              </div>
                              <Field label="Tanggal Kalibrasi / Rekondisi">
                                <input name="calibrationDate" type="date" defaultValue={fmtDate(today)} required className={`${inputCls} font-mono`} />
                              </Field>
                              <Field label="Tambahan Masa Pakai (Bulan)">
                                <input name="addMonths" type="number" min={0} defaultValue={12} required className={`${inputCls} font-mono`} />
                                <span className="text-[11px] text-slate-400 mt-1 block">Misal: 12 bln (1 tahun) perpanjangan target masa pakai operasional.</span>
                              </Field>
                              <Field label="Catatan / Hasil Uji Akurasi">
                                <input name="notes" placeholder="cth: Lulus tera metrologi, pressure gauge normal, No. Sertifikat #102/2026" className={inputCls} />
                              </Field>
                              <div className="pt-2"><button className={btnPrimary}>Simpan & Perbarui Masa Pakai</button></div>
                            </form>
                          </FormDialog>

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
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="Mulai Pakai / Beli">
                                  <input name="purchaseDate" type="date" defaultValue={a.purchaseDate ? fmtDate(a.purchaseDate) : ""} className={`${inputCls} font-mono`} />
                                </Field>
                                <Field label="Target Masa Pakai (bln)">
                                  <input name="lifespanMonths" type="number" min={1} defaultValue={a.lifespanMonths ?? ""} placeholder="cth: 60" className={`${inputCls} font-mono`} />
                                </Field>
                              </div>
                              <div className="pt-2"><button className={btnPrimary}>Simpan</button></div>
                            </form>
                          </FormDialog>

                          <form action={toggleAsset} className="w-full">
                            <input type="hidden" name="id" value={a.id} />
                            <button
                              type="submit"
                              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${a.isActive
                                  ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                  : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                }`}
                            >
                              <Power className="h-3.5 w-3.5 shrink-0" />
                              <span>{a.isActive ? "Nonaktifkan Aset" : "Aktifkan Aset"}</span>
                            </button>
                          </form>
                        </>
                      )}
                    </RowActionMenu>
                  </td>
                </tr>
              );
            })}
            {!assets.length && <Empty cols={11} text="Belum ada aset terdaftar." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
