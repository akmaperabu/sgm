import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { RowActionMenu } from "@/components/row-action-menu";
import { PurchaseRequestForm } from "@/components/purchase-request-form";
import { Badge, Empty, Field, StatusBadge, btnDanger, btnPrimary, inputCls, selectCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { ITEM_CATEGORIES, PR_FLOW, categoryLabel, siteLabel } from "@/lib/constants";
import { fmtDate, num } from "@/lib/format";
import { advancePurchase } from "@/actions/goods";
import { Camera, CheckCircle2, Clock, PackageCheck, Truck, XCircle } from "lucide-react";

function Progress({ status }: { status: string }) {
  const idx = PR_FLOW.indexOf(status as (typeof PR_FLOW)[number]);
  if (status === "Rejected") return <span className="text-xs font-semibold text-rose-700">Ditolak</span>;
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

  const prs = await prisma.purchaseRequest.findMany({
    where: {
      ...ctx.siteWhere,
      OR: [{ periodId: ctx.period.id }, ...(ctx.period.isActive ? [{ status: { notIn: ["Complete", "Rejected"] } }] : [])],
    },
    include: { item: true, requester: true },
    orderBy: { createdAt: "desc" },
  });
  const items = ctx.readOnly ? [] : await prisma.inventoryItem.findMany({ where: { ...ctx.siteWhere, isActive: true }, orderBy: { name: "asc" } });
  const canEdit = ctx.isAdmin && !ctx.readOnly;

  return (
    <>
      <PageHeader
        ctx={ctx}
        sp={sp}
        title="Pembelian & Tracking (PR/PO Status)"
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

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} ${stickyTh}`}>Barang</th><th className={th}>No. PR</th>
              {ctx.site === "ALL" && <th className={th}>Site</th>}
              <th className={th}>Kategori</th><th className={`${th} text-right`}>Qty</th><th className={th}>Pemohon</th>
              <th className={th}>Progres</th><th className={th}>Status</th><th className={th}>PO / Vendor</th><th className={th}>Resi / ETA</th>
              {canEdit && <th className={th}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {prs.map((p) => {
              const name = p.item?.name ?? p.newItemName;
              return (
                <tr key={p.id} className="group hover:bg-slate-50/70 transition-colors">
                  <td className={`${td} ${stickyTd}`}>
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <span>{name}</span>
                      {p.isNewItem && <Badge tone="blue">Barang Baru</Badge>}
                    </div>
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
                  <td className={`${td} text-right font-mono font-semibold text-slate-900`}>{num(p.qty)}</td>
                  <td className={td}>{p.requester.name}</td>
                  <td className={td}><Progress status={p.status} /></td>
                  <td className={td}><StatusBadge status={p.status} />{p.rejectNote && <div className="text-xs text-rose-700 font-medium mt-1">{p.rejectNote}</div>}</td>
                  <td className={`${td} text-xs`}><span className="font-mono text-slate-800 font-medium">{p.poNumber ?? "-"}</span><div className="text-slate-400 mt-0.5">{p.vendor ?? ""}</div></td>
                  <td className={`${td} text-xs`}><span className="font-mono text-slate-800 font-medium">{p.trackingNo ?? "-"}</span><div className="font-mono text-slate-400 mt-0.5">{p.eta ? fmtDate(p.eta) : ""}</div></td>
                  {canEdit && (
                    <td className={td}>
                      {["Submitted", "Approved", "On Process", "In Transit"].includes(p.status) ? (
                        <RowActionMenu>
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
                                <form action={advancePurchase} className="grid gap-3">
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="step" value="process" />
                                  <Field label="Nomor PO"><input name="poNumber" required className={`${inputCls} font-mono`} placeholder="PO-2610-0001" /></Field>
                                  <Field label="Vendor"><input name="vendor" className={inputCls} placeholder="Nama vendor / toko" /></Field>
                                  <div><button className={btnPrimary}>Set On Process</button></div>
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

                          {p.status === "In Transit" && (
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
                                    <Field label="Jumlah Fisik Diterima"><input name="receivedQty" type="number" min={1} defaultValue={p.qty} required className={`${inputCls} font-mono`} /></Field>
                                  </div>
                                  <div className="pt-2"><button className={`${btnPrimary} w-full`}>Simpan ke Master &amp; Terima Fisik</button></div>
                                </form>
                              </FormDialog>
                            ) : (
                              <form action={advancePurchase} className="w-full">
                                <input type="hidden" name="id" value={p.id} />
                                <input type="hidden" name="step" value="complete" />
                                <button
                                  type="submit"
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                                >
                                  <PackageCheck className="h-3.5 w-3.5 shrink-0" />
                                  <span>Complete (Terima Fisik)</span>
                                </button>
                              </form>
                            )
                          )}
                        </RowActionMenu>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {!prs.length && <Empty cols={11} text="Belum ada pengajuan pembelian." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
