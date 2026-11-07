import Link from "next/link";
import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { RowActionMenu } from "@/components/row-action-menu";
import { PurchaseRequestForm } from "@/components/purchase-request-form";
import { ViewDetailDialog, DetailSection, DetailItem } from "@/components/view-detail-dialog";
import { PrintSlipDialog } from "@/components/print-slip-dialog";
import { Badge, Empty, Field, StatusBadge, btnDanger, btnPrimary, inputCls, selectCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { ITEM_CATEGORIES, PR_FLOW, categoryLabel, siteLabel } from "@/lib/constants";
import { fmtDate, fmtMoney, num } from "@/lib/format";
import { advancePurchase } from "@/actions/goods";
import { Camera, CheckCircle2, Clock, PackageCheck, Truck, XCircle, Eye, Printer } from "lucide-react";

function Progress({ status }: { status: string }) {
  const idx = PR_FLOW.indexOf(status as (typeof PR_FLOW)[number]);
  if (status === "Rejected") return <span className="text-xs font-semibold text-rose-700">Ditolak</span>;
  if (status === "Partially Received") {
    return (
      <div className="flex items-center gap-1" title="Diterima Sebagian (3.5/5)">
        <span className="h-1.5 w-3.5 rounded-full bg-blue-700" />
        <span className="h-1.5 w-3.5 rounded-full bg-blue-700" />
        <span className="h-1.5 w-3.5 rounded-full bg-blue-700" />
        <span className="h-1.5 w-3.5 rounded-full bg-amber-500 animate-pulse" />
        <span className="h-1.5 w-3.5 rounded-full bg-slate-200" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1" title={`${idx + 1}/5 - ${status}`}>
      {PR_FLOW.map((s, i) => (
        <span key={s} className={`h-1.5 w-3.5 rounded-full ${i <= idx ? (idx === 4 ? "bg-emerald-600" : "bg-blue-700") : "bg-slate-200"}`} />
      ))}
    </div>
  );
}

export default async function PurchasingPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);
  const currentStatus = sp.status ? String(sp.status) : "ALL";

  const [allPrs, items, vendors] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where: {
        ...ctx.siteWhere,
        OR: [{ periodId: ctx.period.id }, ...(ctx.period.isActive ? [{ status: { notIn: ["Complete", "Rejected"] } }] : [])],
      },
      include: { item: true, requester: true, vendorRelation: true },
      orderBy: { createdAt: "desc" },
    }),
    ctx.readOnly ? [] : prisma.inventoryItem.findMany({ where: { ...ctx.siteWhere, isActive: true }, orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const canEdit = ctx.isAdmin && !ctx.readOnly;

  // Status Tab Counts
  const statusCounts = {
    ALL: allPrs.length,
    Submitted: allPrs.filter((p) => p.status === "Submitted").length,
    Approved: allPrs.filter((p) => p.status === "Approved").length,
    "On Process": allPrs.filter((p) => p.status === "On Process").length,
    "In Transit": allPrs.filter((p) => p.status === "In Transit").length,
    "Partially Received": allPrs.filter((p) => p.status === "Partially Received").length,
    Complete: allPrs.filter((p) => p.status === "Complete").length,
    Rejected: allPrs.filter((p) => p.status === "Rejected").length,
  };

  const prs = currentStatus === "ALL" ? allPrs : allPrs.filter((p) => p.status === currentStatus);

  const tabs = [
    { id: "ALL", label: "Semua", count: statusCounts.ALL },
    { id: "Submitted", label: "Perlu Approval", count: statusCounts.Submitted, alert: statusCounts.Submitted > 0 },
    { id: "Approved", label: "Siap Buat PO", count: statusCounts.Approved },
    { id: "On Process", label: "Proses Pesanan", count: statusCounts["On Process"] },
    { id: "In Transit", label: "Dalam Pengiriman", count: statusCounts["In Transit"] },
    { id: "Partially Received", label: "Diterima Sebagian", count: statusCounts["Partially Received"] },
    { id: "Complete", label: "Selesai", count: statusCounts.Complete },
    { id: "Rejected", label: "Ditolak", count: statusCounts.Rejected },
  ];

  // Helper url query
  const makeTabHref = (tabId: string) => {
    const q = new URLSearchParams();
    if (sp.period) q.set("period", String(sp.period));
    if (tabId !== "ALL") q.set("status", tabId);
    return `/purchasing${q.toString() ? `?${q.toString()}` : ""}`;
  };

  return (
    <>
      <PageHeader
        ctx={ctx}
        title="Pembelian & Tracking (PR/PO Status)"
        desc="Kelola pengajuan pembelian, penerbitan PO, vendor, estimasi anggaran, dan pelacakan pengiriman."
        actions={
          !ctx.readOnly ? (
            <FormDialog label="Request Beli Barang" title="Purchase Request Baru">
              <PurchaseRequestForm
                isAdmin={ctx.isAdmin}
                defaultSite={ctx.writeSite}
                items={items.map((i) => ({ id: i.id, siteId: i.siteId, label: `${i.code} - ${i.name} (stok ${i.currentStock})` }))}
              />
            </FormDialog>
          ) : null
        }
      />

      {/* Filter Tabs Berdasarkan Status */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs select-none">
        {tabs.map((t) => {
          const active = currentStatus === t.id;
          return (
            <Link
              key={t.id}
              href={makeTabHref(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 font-semibold transition-all shadow-2xs ${active
                ? "bg-blue-700 text-white shadow-blue-700/20"
                : "border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${active
                  ? "bg-white/20 text-white"
                  : t.alert
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                  }`}
              >
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} ${stickyTh}`}>Barang</th>
              <th className={th}>No. PR</th>
              {ctx.site === "ALL" && <th className={th}>Site</th>}
              <th className={th}>Kategori</th>
              <th className={`${th} text-right`}>Qty &amp; Estimasi Nilai</th>
              <th className={th}>Pemohon</th>
              <th className={th}>Progres</th>
              <th className={th}>Status</th>
              <th className={th}>PO / Vendor</th>
              <th className={th}>Resi / ETA</th>
              <th className={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {prs.map((p) => {
              const name = p.item?.name ?? p.newItemName;
              const remaining = Math.max(0, p.qty - p.receivedQty);
              const isPartial = p.status === "Partially Received" || (p.receivedQty > 0 && p.receivedQty < p.qty);
              const estTotal = p.totalPrice ?? (p.estimatedPrice ? p.estimatedPrice * p.qty : null);

              const slipDetail = {
                docNumber: p.poNumber ? `${p.prNumber} / ${p.poNumber}` : p.prNumber,
                docTitle: p.poNumber ? "PURCHASE ORDER & PERMINTAAN PENGADAAN (PR/PO SLIP)" : "SURAT PERMINTAAN PEMBELIAN (PURCHASE REQUEST SLIP)",
                date: fmtDate(p.createdAt),
                siteName: siteLabel(p.siteId),
                requesterOrVendorLabel: (p.vendorRelation?.name ?? p.vendor) ? "Vendor Terpilih" : "Pemohon (Requester)",
                requesterOrVendorValue: (p.vendorRelation?.name ?? p.vendor) ?? p.requester.name,
                officerName: "Staff Procurement / Purchasing",
                purposeOrRefLabel: "Keterangan / PO & Resi",
                purposeOrRefValue: [
                  p.poNumber ? `No. PO: ${p.poNumber}` : null,
                  `Status: ${p.status}`,
                  p.trackingNo ? `No. Resi/SJ: ${p.trackingNo}` : null,
                  p.notes ? `Catatan: ${p.notes}` : null,
                ].filter(Boolean).join(" • "),
                items: [
                  {
                    code: p.item?.code ?? p.newItemCode ?? "ITEM-BARU",
                    name: name ?? "Barang Pengadaan",
                    category: categoryLabel(p.item?.category ?? p.newItemCategory),
                    unit: p.item?.unit ?? "pcs",
                    qty: p.qty,
                    price: p.estimatedPrice,
                    total: estTotal,
                  },
                ],
                notes: p.notes,
                signatures: {
                  firstTitle: "Diajukan Oleh",
                  firstName: `${p.requester.name} (Pemohon)`,
                  secondTitle: "Disetujui Oleh",
                  secondName: "Staff Procurement",
                },
              };

              const detailContent = (
                <div className="space-y-4">
                  <DetailSection title="Rincian Permintaan (PR)">
                    <DetailItem label="Nomor Dokumen PR" value={<span className="font-mono text-slate-900">{p.prNumber}</span>} />
                    <DetailItem label="Tanggal Pengajuan" value={fmtDate(p.createdAt)} />
                    <DetailItem label="Status PR" value={<StatusBadge status={p.status} />} />
                    <DetailItem label="Site Tujuan" value={siteLabel(p.siteId)} />
                    <DetailItem label="Pemohon (Requester)" value={p.requester.name} />
                    <DetailItem label="Catatan / Spesifikasi" value={p.notes || "-"} />
                    {p.rejectNote && (
                      <DetailItem label="Alasan Penolakan" value={<span className="text-rose-700 font-medium">{p.rejectNote}</span>} span2 />
                    )}
                  </DetailSection>

                  <DetailSection title="Data Barang & Estimasi Biaya">
                    <DetailItem label="Nama Barang" value={name} highlight span2 />
                    <DetailItem label="Kategori" value={categoryLabel(p.item?.category ?? p.newItemCategory)} />
                    <DetailItem label="Tipe Pengadaan" value={p.isNewItem ? "Barang Baru (Pengadaan)" : "Barang Terdaftar"} />
                    <DetailItem label="Jumlah Permintaan" value={<span className="font-semibold text-slate-900">{num(p.qty)} {p.item?.unit ?? "pcs"}</span>} />
                    <DetailItem label="Status Fisik Gudang" value={isPartial ? `Diterima: ${num(p.receivedQty)} (Sisa: ${num(remaining)})` : p.status === "Complete" ? "Lengkap Diterima" : "Menunggu Kedatangan"} />
                    <DetailItem label="Estimasi Harga Satuan" value={<span className="font-mono text-slate-800">{p.estimatedPrice ? fmtMoney(p.estimatedPrice) : "-"}</span>} />
                    <DetailItem
                      label="Total Nilai Pengadaan"
                      value={<span className="font-semibold font-mono text-slate-900">{estTotal ? fmtMoney(estTotal) : "-"}</span>}
                      highlight
                    />
                    {p.photoUrl && (
                      <DetailItem
                        label="Foto Sampel"
                        value={
                          <a href={p.photoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-700 hover:underline font-medium">
                            <Camera className="h-3.5 w-3.5" /> Buka Foto Contoh
                          </a>
                        }
                        span2
                      />
                    )}
                  </DetailSection>

                  <DetailSection title="Data PO & Vendor Rekanan">
                    <DetailItem label="Nomor PO" value={<span className="font-mono text-slate-800">{p.poNumber || "-"}</span>} />
                    <DetailItem label="Vendor Rekanan" value={p.vendorRelation?.name ?? p.vendor ?? "-"} />
                    <DetailItem label="Nomor Resi / Surat Jalan" value={<span className="font-mono text-slate-800">{p.trackingNo || "-"}</span>} />
                    <DetailItem label="Estimasi Tiba (ETA)" value={p.eta ? fmtDate(p.eta) : "-"} />
                    <DetailItem label="Tanggal Disetujui" value={fmtDate(p.approvedAt)} />
                    <DetailItem label="Diterima di Gudang" value={fmtDate(p.receivedAt)} />
                  </DetailSection>

                  <div className="px-6 py-4 flex items-center justify-between gap-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Cetak berkas fisik dokumen pengadaan:</span>
                    <PrintSlipDialog
                      triggerLabel="Cetak Bukti PR / PO"
                      detail={slipDetail}
                    />
                  </div>
                </div>
              );

              return (
                <tr key={p.id} className="group hover:bg-slate-50/70 transition-colors">
                  <td className={`${td} ${stickyTd}`}>
                    <ViewDetailDialog
                      title={`Detail PR: ${p.prNumber}`}
                      subtitle={`${name} • ${siteLabel(p.siteId)}`}
                      trigger={
                        <div className="text-left group/item cursor-pointer">
                          <div className="font-semibold text-slate-900 group-hover/item:text-blue-700 transition-colors underline-offset-2 hover:underline flex items-center gap-2">
                            <span>{name}</span>
                            {p.isNewItem && <Badge tone="blue">Barang Baru</Badge>}
                          </div>
                        </div>
                      }
                    >
                      {detailContent}
                    </ViewDetailDialog>
                    {p.notes && <div className="max-w-60 truncate text-xs font-normal text-slate-400 mt-0.5" title={p.notes}>{p.notes}</div>}
                    {p.photoUrl && (
                      <div className="mt-1">
                        <a
                          href={p.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          <Camera className="h-3 w-3" />
                          <span>Foto Contoh</span>
                        </a>
                      </div>
                    )}
                  </td>
                  <td className={`${td} font-mono text-xs text-slate-700`}>
                    <div className="font-semibold">{p.prNumber}</div>
                    <div className="text-slate-400 font-sans mt-0.5">{fmtDate(p.createdAt)}</div>
                  </td>
                  {ctx.site === "ALL" && <td className={td}>{siteLabel(p.siteId)}</td>}
                  <td className={td}>{categoryLabel(p.item?.category ?? p.newItemCategory)}</td>
                  <td className={`${td} text-right font-mono text-xs`}>
                    <div className="font-bold text-slate-900">{num(p.qty)}</div>
                    {isPartial && (
                      <div className="text-[11px] text-amber-700 font-semibold">
                        Diterima: {num(p.receivedQty)}/{num(p.qty)}
                      </div>
                    )}
                    {estTotal && (
                      <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        {fmtMoney(estTotal)}
                      </div>
                    )}
                  </td>
                  <td className={td}>{p.requester.name}</td>
                  <td className={td}><Progress status={p.status} /></td>
                  <td className={td}><StatusBadge status={p.status} />{p.rejectNote && <div className="text-xs text-rose-700 font-medium mt-1">{p.rejectNote}</div>}</td>
                  <td className={`${td} text-xs`}>
                    <span className="font-mono text-slate-800 font-medium">{p.poNumber ?? "-"}</span>
                    <div className="text-slate-500 font-medium mt-0.5">{p.vendorRelation?.name ?? p.vendor ?? ""}</div>
                  </td>
                  <td className={`${td} text-xs`}><span className="font-mono text-slate-800 font-medium">{p.trackingNo ?? "-"}</span><div className="font-mono text-slate-400 mt-0.5">{p.eta ? fmtDate(p.eta) : ""}</div></td>
                  <td className={td}>
                    <RowActionMenu>
                      <ViewDetailDialog
                        title={`Detail PR: ${p.prNumber}`}
                        subtitle={`${name} • ${siteLabel(p.siteId)}`}
                        trigger={
                          <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                            <Eye className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>Lihat Detail</span>
                          </div>
                        }
                      >
                        {detailContent}
                      </ViewDetailDialog>

                      {/* Print Document PR/PO */}
                      <PrintSlipDialog
                        trigger={
                          <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                            <Printer className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>Cetak Bukti PR / PO</span>
                          </div>
                        }
                        detail={slipDetail}
                      />

                      {canEdit && (
                        <>
                          {p.status === "Submitted" && (
                            <>
                              <FormDialog
                                title={`Approve ${p.prNumber}`}
                                trigger={
                                  <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    <span>Approve PR</span>
                                  </div>
                                }
                              >
                                <form action={advancePurchase} className="grid gap-3">
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="step" value="approve" />
                                  {p.isNewItem ? (
                                    <>
                                      <p className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 leading-relaxed font-medium">
                                        Setujui pembelian barang baru? Barang akan resmi didaftarkan ke Master Data saat barang fisik tiba di gudang. Rapikan nama dan kategori bila perlu.
                                      </p>
                                      <Field label="Nama Barang"><input name="newItemName" defaultValue={p.newItemName ?? ""} required className={inputCls} /></Field>
                                      <div className="grid grid-cols-2 gap-3">
                                        <Field label="Kode (opsional)"><input name="newItemCode" placeholder="Kosong = otomatis" className={`${inputCls} font-mono uppercase`} /></Field>
                                        <Field label="Kategori">
                                          <select name="newItemCategory" defaultValue={p.newItemCategory ?? "ATK"} className={selectCls}>
                                            {ITEM_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                                          </select>
                                        </Field>
                                      </div>
                                    </>
                                  ) : <p className="text-sm text-slate-700">Setujui pembelian <strong>{name}</strong> sejumlah <strong>{p.qty}</strong>?</p>}
                                  <div className="pt-2"><button className={btnPrimary}>Approve</button></div>
                                </form>
                              </FormDialog>

                              <FormDialog
                                title={`Tolak ${p.prNumber}`}
                                trigger={
                                  <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors">
                                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span>Tolak PR (Reject)</span>
                                  </div>
                                }
                              >
                                <form action={advancePurchase} className="grid gap-3">
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="step" value="reject" />
                                  <Field label="Alasan Penolakan"><input name="note" required className={inputCls} placeholder="Masukkan alasan penolakan..." /></Field>
                                  <div><button className={btnDanger}>Tolak PR</button></div>
                                </form>
                              </FormDialog>
                            </>
                          )}

                          {p.status === "Approved" && (
                            <>
                              <FormDialog
                                title={`Proses Pembelian ${p.prNumber}`}
                                trigger={
                                  <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors">
                                    <Clock className="h-3.5 w-3.5 shrink-0" />
                                    <span>Set On Process (Input PO)</span>
                                  </div>
                                }
                              >
                                <form action={advancePurchase} className="grid gap-3.5">
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="step" value="process" />
                                  <Field label="Nomor PO">
                                    <input name="poNumber" required className={`${inputCls} font-mono`} placeholder="PO-2610-0001" />
                                  </Field>

                                  <Field label="Vendor Rekanan Terpilih">
                                    <select
                                      name="vendorId"
                                      required
                                      className={selectCls}
                                      defaultValue={p.vendorId ?? ""}
                                    >
                                      <option value="" disabled>-- Pilih Vendor dari Master Data --</option>
                                      {vendors.map((v) => (
                                        <option key={v.id} value={v.id}>
                                          {v.name} {v.contactPerson ? `(PIC: ${v.contactPerson})` : ""}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                                      Vendor belum terdaftar? Daftarkan terlebih dahulu di menu{" "}
                                      <a
                                        href="/vendors"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-blue-700 underline"
                                      >
                                        Master Vendor
                                      </a>{" "}
                                      untuk meminimalisir kesalahan input.
                                    </p>
                                  </Field>

                                  <Field label="Harga Satuan Kesepakatan (Rp, opsional)">
                                    <input
                                      name="estimatedPrice"
                                      type="number"
                                      min={0}
                                      step="1000"
                                      defaultValue={p.estimatedPrice ?? ""}
                                      className={`${inputCls} font-mono`}
                                      placeholder="cth: 250000"
                                    />
                                  </Field>

                                  <div className="pt-2"><button className={btnPrimary}>Set On Process &amp; Simpan PO</button></div>
                                </form>
                              </FormDialog>

                              <FormDialog
                                title={`Tolak ${p.prNumber}`}
                                trigger={
                                  <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors">
                                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span>Tolak PR (Reject)</span>
                                  </div>
                                }
                              >
                                <form action={advancePurchase} className="grid gap-3">
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="step" value="reject" />
                                  <Field label="Alasan Penolakan"><input name="note" required className={inputCls} placeholder="Masukkan alasan penolakan..." /></Field>
                                  <div><button className={btnDanger}>Tolak PR</button></div>
                                </form>
                              </FormDialog>
                            </>
                          )}

                          {p.status === "On Process" && (
                            <FormDialog
                              title={`Pengiriman ${p.prNumber}`}
                              trigger={
                                <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors">
                                  <Truck className="h-3.5 w-3.5 shrink-0" />
                                  <span>Set In Transit (No Resi/ETA)</span>
                                </div>
                              }
                            >
                              <form action={advancePurchase} className="grid gap-3">
                                <input type="hidden" name="id" value={p.id} />
                                <input type="hidden" name="step" value="transit" />
                                <Field label="Estimasi Tanggal Tiba"><input name="eta" type="date" className={`${inputCls} font-mono`} /></Field>
                                <Field label="No. Resi / Surat Jalan"><input name="trackingNo" className={`${inputCls} font-mono`} placeholder="SJ-..." /></Field>
                                <div><button className={btnPrimary}>Set In Transit</button></div>
                              </form>
                            </FormDialog>
                          )}

                          {(p.status === "In Transit" || p.status === "Partially Received") && (
                            p.isNewItem && !p.itemId ? (
                              <FormDialog
                                title={`Registrasi & Terima (${p.prNumber})`}
                                trigger={
                                  <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                                    <PackageCheck className="h-3.5 w-3.5 shrink-0" />
                                    <span>Registrasi &amp; Terima Fisik</span>
                                  </div>
                                }
                              >
                                <form action={advancePurchase} className="grid gap-3.5">
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="step" value="complete" />
                                  <p className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 leading-relaxed font-medium">
                                    Barang baru belum terdaftar di Master Data. Konfirmasi detail berikut untuk mendaftarkannya ke Master Data dan menerima stok fisik.
                                  </p>
                                  <Field label="Nama Barang Resmi"><input name="name" defaultValue={p.newItemName ?? ""} required className={inputCls} /></Field>
                                  <div className="grid grid-cols-2 gap-3">
                                    <Field label="Kategori">
                                      <select name="category" defaultValue={p.newItemCategory ?? "SPAREPART"} className={selectCls}>
                                        {ITEM_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                                      </select>
                                    </Field>
                                    <Field label="Kode Barang (opsional)"><input name="code" defaultValue={p.newItemCode ?? ""} placeholder="Kosong = otomatis" className={`${inputCls} font-mono uppercase`} /></Field>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <Field label="Satuan"><input name="unit" defaultValue="pcs" required className={inputCls} /></Field>
                                    <Field label={`Jumlah Fisik Diterima (Sisa: ${remaining})`}><input name="receivedQty" type="number" min={1} max={remaining} defaultValue={remaining} required className={`${inputCls} font-mono`} /></Field>
                                  </div>
                                  <Field label="Stok Minimum (opsional)">
                                    <input name="minStock" type="number" min={0} defaultValue={0} className={`${inputCls} font-mono`} />
                                  </Field>
                                  <div className="pt-2"><button className={`${btnPrimary} w-full`}>Simpan ke Master &amp; Terima Fisik</button></div>
                                </form>
                              </FormDialog>
                            ) : (
                              <FormDialog
                                title={`Penerimaan Fisik (${p.prNumber})`}
                                trigger={
                                  <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                                    <PackageCheck className="h-3.5 w-3.5 shrink-0" />
                                    <span>Terima Fisik Gudang</span>
                                  </div>
                                }
                              >
                                <form action={advancePurchase} className="grid gap-3">
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="step" value="complete" />
                                  <p className="text-xs text-slate-600">
                                    Menerima fisik barang <strong>{name}</strong>. Total pesanan: <strong>{p.qty}</strong>.
                                    {p.receivedQty > 0 && <span> Sudah diterima sebelumnya: <strong>{p.receivedQty}</strong>.</span>}
                                  </p>
                                  <Field label={`Jumlah Diterima Saat Ini (Maksimal: ${remaining})`}>
                                    <input
                                      name="receivedQty"
                                      type="number"
                                      min={1}
                                      max={remaining}
                                      defaultValue={remaining}
                                      required
                                      className={`${inputCls} font-mono`}
                                    />
                                  </Field>
                                  <div><button className={btnPrimary}>Simpan Penerimaan Fisik</button></div>
                                </form>
                              </FormDialog>
                            )
                          )}
                        </>
                      )}
                    </RowActionMenu>
                  </td>
                </tr>
              );
            })}
            {!prs.length && <Empty cols={11} text="Belum ada pengajuan pembelian pada filter ini." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
