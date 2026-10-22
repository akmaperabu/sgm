import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { ItemSearchSelect } from "@/components/item-search-select";
import { Empty, Field, StatusBadge, btnDanger, btnPrimary, inputCls, selectCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { siteLabel } from "@/lib/constants";
import { fmtDateTime, num } from "@/lib/format";
import { decideIssue, requestIssue } from "@/actions/goods";

export default async function GoodsIssuePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);

  const issues = await prisma.goodsIssue.findMany({
    where: {
      ...ctx.siteWhere,
      OR: [{ periodId: ctx.period.id }, ...(ctx.period.isActive ? [{ status: "Pending Approval" }] : [])],
    },
    include: { item: true, requester: true, ticket: true },
    orderBy: [{ createdAt: "desc" }],
  });

  const [items, tickets] = ctx.readOnly
    ? [[], []]
    : await Promise.all([
        prisma.inventoryItem.findMany({ where: { ...ctx.siteWhere, isActive: true, currentStock: { gt: 0 } }, orderBy: [{ siteId: "asc" }, { name: "asc" }] }),
        prisma.maintenanceTicket.findMany({ where: { ...ctx.siteWhere, status: { in: ["Open", "In Progress", "Upcoming"] } }, include: { asset: true }, orderBy: { createdAt: "desc" } }),
      ]);

  return (
    <>
      <PageHeader
        ctx={ctx}
        sp={sp}
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
                <Field label="Jumlah"><input name="qty" type="number" min={1} required className={`${inputCls} font-mono`} /></Field>
                <Field label="Keperluan"><input name="purpose" required placeholder="Pemakaian harian / servis alat" className={inputCls} /></Field>
                <Field label="Terkait Tiket Maintenance (opsional)">
                  <select name="ticketId" defaultValue="" className={selectCls}>
                    <option value="">- Tidak terkait -</option>
                    {tickets.map((t) => (
                      <option key={t.id} value={t.id}>{t.number} - {t.asset.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="pt-2">
                  <button disabled={items.length === 0} className={`${btnPrimary} w-full sm:w-auto`}>Ajukan Request</button>
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
              {ctx.isAdmin && !ctx.readOnly && <th className={th}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {issues.map((g) => (
              <tr key={g.id} className="group hover:bg-slate-50/70 transition-colors">
                <td className={`${td} ${stickyTd} font-semibold text-slate-900`}>{g.item.name}</td>
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
                {ctx.isAdmin && !ctx.readOnly && (
                  <td className={td}>
                    {g.status === "Pending Approval" ? (
                      <div className="flex items-center gap-1.5">
                        <FormDialog label="Approve / Serahkan" title={`Konfirmasi Penyerahan - ${g.number}`} small icon={false}>
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
                      </div>
                    ) : <span className="text-slate-400">-</span>}
                  </td>
                )}
              </tr>
            ))}
            {!issues.length && <Empty cols={10} text="Belum ada pengambilan barang pada periode ini." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
