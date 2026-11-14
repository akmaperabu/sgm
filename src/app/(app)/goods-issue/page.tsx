import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { ViewDetailDialog, DetailSection, DetailItem } from "@/components/view-detail-dialog";
import { ItemSearchSelect } from "@/components/item-search-select";
import { Empty, Field, StatusBadge, btnDanger, btnPrimary, inputCls, selectCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { categoryLabel, siteLabel } from "@/lib/constants";
import { fmtDateTime, num } from "@/lib/format";
import { decideIssue, requestIssue } from "@/actions/goods";
import { PrintSlipDialog } from "@/components/print-slip-dialog";
import { Eye } from "lucide-react";

export default async function GoodsIssuePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);

  const issues = await prisma.goodsIssue.findMany({
    where: {
      ...ctx.siteWhere,
      OR: [{ periodId: ctx.period.id }, ...(ctx.period.isActive ? [{ status: "Pending Approval" }] : [])],
    },
    include: {
      item: true,
      requester: { select: { id: true, name: true, email: true } },
      ticket: { select: { id: true, number: true, type: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const [items, tickets] = ctx.readOnly
    ? [[], []]
    : await Promise.all([
      prisma.inventoryItem.findMany({
        where: { ...ctx.siteWhere, isActive: true, currentStock: { gt: 0 } },
        select: { id: true, siteId: true, code: true, name: true, currentStock: true, unit: true },
        orderBy: [{ siteId: "asc" }, { name: "asc" }],
      }),
      prisma.maintenanceTicket.findMany({
        where: { ...ctx.siteWhere, status: { in: ["Open", "In Progress", "Upcoming"] } },
        select: { id: true, number: true, asset: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  return (
    <>
      <PageHeader
        ctx={ctx}
        title="Pengambilan Barang (Goods Issue)"
        desc="Request ambil barang gudang. Stok terpotong otomatis saat Admin menyetujui."
        actions={
          !ctx.readOnly ? (
            <FormDialog label="Request Ambil Barang" title="Request Ambil Barang Gudang">
              <form action={requestIssue} className="grid gap-3">
                <Field label="Barang (hanya stok tersedia)">
                  {items.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Tidak ada barang dengan stok tersedia di site ini.
                    </div>
                  ) : (
                    <ItemSearchSelect
                      name="itemId"
                      required
                      placeholder="Ketik nama atau kode barang gudang..."
                      items={items.map((i) => ({
                        id: i.id,
                        label: `${i.code} - ${i.name}`,
                        sublabel: ctx.site === "ALL" ? siteLabel(i.siteId) : undefined,
                        badge: `Stok: ${i.currentStock} ${i.unit}`,
                      }))}
                    />
                  )}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Jumlah Ambil">
                    <input name="qty" type="number" min={1} required defaultValue={1} className={`${inputCls} font-mono`} />
                  </Field>
                  <Field label="Terkait Tiket Perbaikan (opsional)">
                    <select name="ticketId" defaultValue="" className={selectCls}>
                      <option value="">- Tidak terkait -</option>
                      {tickets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.number} - {t.asset.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Keperluan / Alasan Pengambilan">
                  <textarea name="purpose" required rows={2} className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15" placeholder="cth: Penggantian seal oli kompresor oksigen..." />
                </Field>
                <div className="pt-2">
                  <button disabled={items.length === 0} className={btnPrimary}>Ajukan Request</button>
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
              <th className={`${th} ${stickyTh}`}>Barang</th>
              <th className={th}>No. GI</th>
              <th className={th}>Tanggal</th>
              {ctx.site === "ALL" && <th className={th}>Site</th>}
              <th className={`${th} text-right`}>Qty</th>
              <th className={th}>Keperluan</th>
              <th className={th}>Pemohon</th>
              <th className={th}>Tiket</th>
              <th className={th}>Status</th>
              <th className={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((g) => {
              const detailContent = (
                <div className="space-y-3.5">
                  <DetailSection title="Rincian Pengajuan Goods Issue">
                    <DetailItem label="Nomor Dokumen" value={<span className="font-mono font-bold text-slate-900">{g.number}</span>} />
                    <DetailItem label="Tanggal & Waktu Pengajuan" value={fmtDateTime(g.createdAt)} />
                    <DetailItem label="Status Permintaan" value={<StatusBadge status={g.status} />} />
                    <DetailItem label="Site Penempatan" value={siteLabel(g.siteId)} />
                    <DetailItem label="Pemohon (Requester)" value={g.requester.name} />
                    <DetailItem label="Tiket Terkait" value={g.ticket ? <span className="font-mono">{g.ticket.number}</span> : "Tidak ada"} />
                    <DetailItem label="Keperluan Pengambilan" value={g.purpose} span2 />
                    {g.rejectNote && (
                      <DetailItem label="Alasan Penolakan" value={<span className="text-rose-700 font-medium">{g.rejectNote}</span>} span2 />
                    )}
                  </DetailSection>

                  <DetailSection title="Data Barang Gudang">
                    <DetailItem label="Nama Barang" value={g.item.name} highlight span2 />
                    <DetailItem label="Kode Barang" value={<span className="font-mono text-xs">{g.item.code}</span>} />
                    <DetailItem label="Kategori" value={categoryLabel(g.item.category)} />
                    <DetailItem
                      label="Jumlah Diminta"
                      value={<span className="font-semibold font-mono text-slate-900">{num(g.qty)} {g.item.unit}</span>}
                      highlight
                    />
                    <DetailItem label="Stok Gudang Saat Ini" value={`${num(g.item.currentStock)} ${g.item.unit}`} />
                  </DetailSection>
                </div>
              );

              return (
                <tr key={g.id} className="group hover:bg-slate-50/70 transition-colors">
                  <td className={`${td} ${stickyTd}`}>
                    <ViewDetailDialog
                      title={`Detail Pengambilan: ${g.number}`}
                      subtitle={`${g.item.name} • ${fmtDateTime(g.createdAt)}`}
                      trigger={
                        <div className="text-left group/item cursor-pointer">
                          <span className="font-semibold text-slate-900 group-hover/item:text-blue-700 transition-colors underline-offset-2 hover:underline">
                            {g.item.name}
                          </span>
                        </div>
                      }
                    >
                      {detailContent}
                    </ViewDetailDialog>
                  </td>
                  <td className={`${td} font-mono text-xs font-semibold text-slate-700`}>{g.number}</td>
                  <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDateTime(g.createdAt)}</td>
                  {ctx.site === "ALL" && <td className={td}>{siteLabel(g.siteId)}</td>}
                  <td className={`${td} text-right font-mono font-semibold text-slate-900`}>
                    {num(g.qty)} <span className="text-xs font-normal text-slate-400">{g.item.unit}</span>
                  </td>
                  <td className={td}>
                    <div className="text-slate-800">{g.purpose}</div>
                    {g.rejectNote && <div className="text-xs text-rose-600 font-medium mt-1">Ditolak: {g.rejectNote}</div>}
                  </td>
                  <td className={td}>{g.requester.name}</td>
                  <td className={`${td} font-mono text-xs text-slate-500`}>{g.ticket?.number ?? "-"}</td>
                  <td className={td}><StatusBadge status={g.status} /></td>
                  <td className={td}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <ViewDetailDialog
                        title={`Detail Pengambilan: ${g.number}`}
                        subtitle={`${g.item.name} • ${fmtDateTime(g.createdAt)}`}
                        trigger={
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-700 active:scale-95 transition-all"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-400" />
                            <span>Detail</span>
                          </button>
                        }
                      >
                        {detailContent}
                      </ViewDetailDialog>

                      {g.status === "Approved" && (
                        <PrintSlipDialog
                          triggerLabel="Cetak Bukti"
                          detail={{
                            docNumber: g.number,
                            docTitle: "BUKTI PENGELUARAN BARANG GUDANG (GOODS ISSUE SLIP)",
                            date: fmtDateTime(g.createdAt),
                            siteName: siteLabel(g.siteId),
                            requesterLabel: "Pemohon / Penerima",
                            requesterValue: g.requester.name,
                            officerName: "Petugas Gudang SGM",
                            purposeOrRefLabel: "Keperluan",
                            purposeOrRefValue: g.ticket ? `${g.purpose} (Tiket: ${g.ticket.number})` : g.purpose,
                            items: [
                              {
                                code: g.item.code,
                                name: g.item.name,
                                category: categoryLabel(g.item.category),
                                unit: g.item.unit,
                                qty: g.qty,
                              },
                            ],
                            notes: g.ticket ? `Terkait tiket perbaikan alat: ${g.ticket.number}` : null,
                            signatures: {
                              firstTitle: "Diserahkan Oleh",
                              firstName: "Petugas Gudang",
                              secondTitle: "Diterima Oleh",
                              secondName: `${g.requester.name} (Teknisi)`,
                              thirdTitle: "Mengetahui",
                              thirdName: "Supervisor Operasional",
                            },
                          }}
                        />
                      )}

                      {ctx.isAdmin && !ctx.readOnly && g.status === "Pending Approval" && (
                        <>
                          <FormDialog label="Approve" title={`Konfirmasi Penyerahan - ${g.number}`} small icon={false}>
                            <form action={decideIssue} className="grid gap-3.5">
                              <input type="hidden" name="id" value={g.id} />
                              <input type="hidden" name="decision" value="approve" />

                              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Nomor Request</span>
                                  <span className="font-mono font-bold text-slate-800">{g.number}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Nama Barang</span>
                                  <span className="font-bold text-slate-900">{g.item.name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Jumlah Diminta</span>
                                  <span className="font-mono font-bold text-blue-700">{num(g.qty)} {g.item.unit}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Stok Gudang Saat Ini</span>
                                  <span className="font-mono font-bold text-slate-800">{num(g.item.currentStock)} {g.item.unit}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Pemohon</span>
                                  <span className="font-semibold text-slate-800">{g.requester.name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Keperluan</span>
                                  <span className="font-medium text-slate-800">{g.purpose}</span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                Apakah Anda yakin ingin menyetujui pengajuan ini? Stok barang di gudang akan otomatis dipotong sebesar <strong>{num(g.qty)} {g.item.unit}</strong>.
                              </p>

                              <div className="pt-2">
                                <button className={`${btnPrimary} w-full`}>Ya, Setujui &amp; Serahkan Barang</button>
                              </div>
                            </form>
                          </FormDialog>

                          <FormDialog label="Reject" title={`Tolak Request - ${g.number}`} variant="secondary" small icon={false}>
                            <form action={decideIssue} className="grid gap-3">
                              <input type="hidden" name="id" value={g.id} />
                              <input type="hidden" name="decision" value="reject" />
                              <Field label="Alasan penolakan"><input name="note" required className={inputCls} placeholder="Tulis alasan penolakan..." /></Field>
                              <div className="pt-2"><button className={`${btnDanger} w-full`}>Tolak Request</button></div>
                            </form>
                          </FormDialog>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!issues.length && <Empty cols={10} text="Belum ada pengambilan barang pada periode ini." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
