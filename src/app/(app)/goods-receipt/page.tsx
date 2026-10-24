import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader, Panel } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { ItemSearchSelect } from "@/components/item-search-select";
import { Badge, Empty, Field, btnPrimary, inputCls, selectCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { PrintSlipDialog } from "@/components/print-slip-dialog";
import { categoryLabel, ITEM_CATEGORIES, siteLabel } from "@/lib/constants";
import { fmtDate, fmtDateTime, num } from "@/lib/format";
import { advancePurchase, receiveManual } from "@/actions/goods";

export default async function GoodsReceiptPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);

  const [transit, moves, items] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where: { ...ctx.siteWhere, status: { in: ["In Transit", "Partially Received"] } },
      include: { item: true },
      orderBy: { eta: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { ...ctx.siteWhere, periodId: ctx.period.id, type: "IN" },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    }),
    ctx.isAdmin ? prisma.inventoryItem.findMany({ where: { ...ctx.siteWhere, isActive: true }, orderBy: [{ siteId: "asc" }, { name: "asc" }] }) : Promise.resolve([]),
  ]);
  const total = moves.reduce((s, m) => s + m.qty, 0);

  return (
    <>
      <PageHeader
        ctx={ctx}
        sp={sp}
        title="Penerimaan Barang (Goods Receipt)"
        desc="Barang masuk ke gudang: dari pembelian (PR Complete) atau penerimaan manual."
        actions={
          ctx.isAdmin && !ctx.readOnly ? (
            <FormDialog label="Penerimaan Manual" title="Penerimaan Barang Manual">
              <form action={receiveManual} className="grid gap-3">
                <Field label="Barang">
                  <ItemSearchSelect
                    name="itemId"
                    required
                    placeholder="Ketik nama atau kode barang..."
                    items={items.map((i) => ({
                      id: i.id,
                      label: `${i.code} - ${i.name}`,
                      sublabel: ctx.site === "ALL" ? siteLabel(i.siteId) : undefined,
                    }))}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Jumlah"><input name="qty" type="number" min={1} required className={`${inputCls} font-mono`} /></Field>
                  <Field label="No. Dokumen (opsional)"><input name="refNo" className={`${inputCls} font-mono`} placeholder="SJ-..." /></Field>
                </div>
                <Field label="Catatan"><input name="note" className={inputCls} placeholder="Catatan penerimaan..." /></Field>
                <div className="pt-2"><button className={`${btnPrimary} w-full sm:w-auto`}>Simpan Penerimaan</button></div>
              </form>
            </FormDialog>
          ) : null
        }
      />

      <div className="space-y-5">
        <Panel title={`Menunggu Penerimaan Fisik (In Transit): ${transit.length}`}>
          <div className={tableWrap + " !border-0"}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={`${th} ${stickyTh}`}>Barang</th>
                  <th className={th}>No. PR</th>
                  <th className={th}>No. PO</th>
                  <th className={th}>Site</th>
                  <th className={`${th} text-right`}>Qty</th>
                  <th className={th}>Resi / SJ</th>
                  <th className={th}>ETA</th>
                  {ctx.isAdmin && <th className={th}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {transit.map((p) => {
                  const isNewWithoutMaster = p.isNewItem && !p.itemId;
                  const remaining = Math.max(0, p.qty - p.receivedQty);
                  const isPartial = p.status === "Partially Received" || (p.receivedQty > 0 && p.receivedQty < p.qty);

                  return (
                    <tr key={p.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className={`${td} ${stickyTd}`}>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{p.item?.name ?? p.newItemName}</span>
                          {isNewWithoutMaster && <Badge tone="blue">Barang Baru</Badge>}
                          {isPartial && <Badge tone="amber">Diterima {num(p.receivedQty)}/{num(p.qty)}</Badge>}
                        </div>
                        {isNewWithoutMaster && (
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            Kategori: {p.newItemCategory ?? "SPAREPART"}
                          </div>
                        )}
                        {p.photoUrl && (
                          <a
                            href={p.photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline mt-0.5"
                          >
                            Lihat Foto Contoh
                          </a>
                        )}
                      </td>
                      <td className={`${td} font-mono text-xs font-semibold text-slate-700`}>{p.prNumber}</td>
                      <td className={`${td} font-mono text-xs text-slate-500`}>{p.poNumber ?? "-"}</td>
                      <td className={td}>{siteLabel(p.siteId)}</td>
                      <td className={`${td} text-right font-mono text-xs`}>
                        <div className="font-bold text-slate-900">{num(p.qty)}</div>
                        {isPartial && (
                          <div className="text-[11px] text-amber-700 font-medium">
                            Sisa: {num(remaining)}
                          </div>
                        )}
                      </td>
                      <td className={`${td} font-mono text-xs text-slate-500`}>{p.trackingNo ?? "-"}</td>
                      <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDate(p.eta)}</td>
                      {ctx.isAdmin && (
                        <td className={td}>
                          {isNewWithoutMaster ? (
                            <FormDialog
                              label={isPartial ? "Terima Sisa" : "Registrasi & Terima"}
                              title={`Registrasi & Terima Barang Baru (${p.prNumber})`}
                              small
                              icon={false}
                            >
                              <form action={advancePurchase} className="grid gap-3.5">
                                <input type="hidden" name="id" value={p.id} />
                                <input type="hidden" name="step" value="complete" />
                                <input type="hidden" name="_to" value="/goods-receipt" />

                                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 leading-relaxed font-medium">
                                  Barang ini belum terdaftar di Master Data. Konfirmasi detail barang di bawah ini untuk otomatis mendaftarkannya ke Master Barang {siteLabel(p.siteId)} dan mencatat stok masuk fisik.
                                </div>

                                <Field label="Nama Barang Resmi">
                                  <input
                                    name="name"
                                    defaultValue={p.newItemName ?? ""}
                                    required
                                    className={inputCls}
                                    placeholder="cth: Filter Udara Donaldson"
                                  />
                                </Field>

                                <div className="grid grid-cols-2 gap-3">
                                  <Field label="Kategori">
                                    <select
                                      name="category"
                                      defaultValue={p.newItemCategory ?? "SPAREPART"}
                                      className={selectCls}
                                    >
                                      {ITEM_CATEGORIES.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.label}
                                        </option>
                                      ))}
                                    </select>
                                  </Field>
                                  <Field label="Kode Barang (opsional)">
                                    <input
                                      name="code"
                                      defaultValue={p.newItemCode ?? ""}
                                      placeholder="Kosong = otomatis"
                                      className={`${inputCls} font-mono uppercase`}
                                    />
                                  </Field>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <Field label="Satuan">
                                    <input
                                      name="unit"
                                      defaultValue="pcs"
                                      required
                                      className={inputCls}
                                      placeholder="pcs, box, set, liter..."
                                    />
                                  </Field>
                                  <Field label={`Jumlah Fisik Diterima (Sisa: ${remaining})`}>
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
                                </div>

                                <Field label="Stok Minimum (opsional)">
                                  <input
                                    name="minStock"
                                    type="number"
                                    min={0}
                                    defaultValue={0}
                                    className={`${inputCls} font-mono`}
                                  />
                                </Field>

                                <div className="pt-2">
                                  <button className={`${btnPrimary} w-full`}>
                                    Daftarkan ke Master &amp; Terima Fisik
                                  </button>
                                </div>
                              </form>
                            </FormDialog>
                          ) : (
                            <form action={advancePurchase} className="flex items-center gap-1.5">
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="step" value="complete" />
                              <input type="hidden" name="_to" value="/goods-receipt" />
                              <input
                                name="receivedQty"
                                type="number"
                                min={1}
                                max={remaining}
                                defaultValue={remaining}
                                aria-label="Jumlah diterima"
                                title={`Maksimal sisa: ${remaining}`}
                                className={`${inputCls} !h-8 !w-20 font-mono`}
                              />
                              <button className={`${btnPrimary} !h-8 !px-3 !text-xs`}>
                                {isPartial ? "Terima Sisa" : "Terima"}
                              </button>
                            </form>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {!transit.length && <Empty cols={8} text="Tidak ada barang dalam pengiriman." />}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={`Riwayat Barang Masuk (${ctx.period.periodName})`} right={<Badge tone="green">Total masuk: {num(total)}</Badge>}>
          <div className={tableWrap + " !border-0"}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={`${th} ${stickyTh}`}>Barang</th>
                  <th className={th}>Tanggal</th>
                  <th className={th}>Site</th>
                  <th className={`${th} text-right`}>Qty</th>
                  <th className={`${th} text-right`}>Saldo</th>
                  <th className={th}>Referensi</th>
                  <th className={th}>Catatan</th>
                  <th className={th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((m) => (
                  <tr key={m.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className={`${td} ${stickyTd} font-semibold text-slate-900`}>{m.item.name}</td>
                    <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDateTime(m.createdAt)}</td>
                    <td className={td}>{siteLabel(m.siteId)}</td>
                    <td className={`${td} text-right font-mono text-emerald-600 font-semibold`}>+{num(m.qty)}</td>
                    <td className={`${td} text-right font-mono font-medium text-slate-900`}>{num(m.balance)}</td>
                    <td className={`${td} font-mono text-xs text-slate-500`}>{m.refType}{m.refNo ? ` / ${m.refNo}` : ""}</td>
                    <td className={td}>{m.note ?? "-"}</td>
                    <td className={td}>
                      <PrintSlipDialog
                        triggerLabel="Cetak Bukti"
                        iconOnly
                        detail={{
                          docNumber: m.refNo ?? `GR-${m.id.slice(-6).toUpperCase()}`,
                          docTitle: "BUKTI PENERIMAAN BARANG FISIK (GOODS RECEIPT SLIP)",
                          date: fmtDateTime(m.createdAt),
                          siteName: siteLabel(m.siteId),
                          requesterOrVendorLabel: "Referensi Pengiriman",
                          requesterOrVendorValue: `${m.refType}${m.refNo ? ` - ${m.refNo}` : ""}`,
                          officerName: "Petugas Gudang SGM",
                          purposeOrRefLabel: "Keterangan Penerimaan",
                          purposeOrRefValue: m.note ?? "Penerimaan fisik barang gudang",
                          items: [
                            {
                              code: m.item.code,
                              name: m.item.name,
                              category: categoryLabel(m.item.category),
                              unit: m.item.unit,
                              qty: m.qty,
                            },
                          ],
                          notes: "Barang telah diterima dan diverifikasi sesuai Surat Jalan/PO fisik.",
                          signatures: {
                            firstTitle: "Diserahkan Oleh (Vendor/Driver)",
                            firstName: "(.............................)",
                            secondTitle: "Diterima Oleh (Gudang)",
                            secondName: "Staff Gudang",
                            thirdTitle: "Mengetahui (Supervisor)",
                            thirdName: "Supervisor Logistik",
                          },
                        }}
                      />
                    </td>
                  </tr>
                ))}
                {!moves.length && <Empty cols={8} text="Belum ada barang masuk pada periode ini." />}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
