import { getCtx, type SearchParams } from "@/lib/context";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { ItemSearchSelect } from "@/components/item-search-select";
import { Empty, Field, btnPrimary, inputCls, selectCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { siteLabel } from "@/lib/constants";
import { fmtDateTime, num } from "@/lib/format";
import { adjustStock } from "@/actions/goods";

export default async function StockAdjustmentPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const ctx = await getCtx(sp);

  const [moves, items] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { ...ctx.siteWhere, periodId: ctx.period.id, type: "ADJUST" },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    }),
    ctx.readOnly ? Promise.resolve([]) : prisma.inventoryItem.findMany({ where: { ...ctx.siteWhere, isActive: true }, orderBy: [{ siteId: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <>
      <PageHeader
        ctx={ctx}
        sp={sp}
        title="Stock Adjustment"
        actions={
          !ctx.readOnly ? (
            <FormDialog label="Adjustment Baru" title="Stock Adjustment">
              <form action={adjustStock} className="grid gap-3.5">
                <Field label="Barang">
                  <ItemSearchSelect
                    name="itemId"
                    required
                    placeholder="Ketik nama atau kode barang..."
                    items={items.map((i) => ({
                      id: i.id,
                      label: `${i.code} - ${i.name}`,
                      sublabel: ctx.site === "ALL" ? siteLabel(i.siteId) : undefined,
                      badge: `Stok Sistem: ${i.currentStock}`,
                    }))}
                  />
                </Field>
                <Field label="Stok Fisik Hasil Hitung"><input name="physical" type="number" min={0} required className={`${inputCls} font-mono`} placeholder="Jumlah fisik aktual" /></Field>
                <Field label="Alasan Penyesuaian"><input name="reason" required placeholder="Contoh: selisih stock opname, barang rusak" className={inputCls} /></Field>
                <div className="pt-2"><button className={btnPrimary}>Simpan Adjustment</button></div>
              </form>
            </FormDialog>
          ) : null
        }
      />
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} ${stickyTh}`}>Barang</th><th className={th}>Tanggal</th><th className={th}>Site</th>
              <th className={`${th} text-right`}>Selisih</th><th className={`${th} text-right`}>Saldo Akhir</th><th className={th}>Alasan</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((m) => (
              <tr key={m.id} className="group hover:bg-slate-50/70 transition-colors">
                <td className={`${td} ${stickyTd} font-semibold text-slate-900`}>{m.item.name}</td>
                <td className={`${td} font-mono text-xs text-slate-500`}>{fmtDateTime(m.createdAt)}</td>
                <td className={td}>{siteLabel(m.siteId)}</td>
                <td className={`${td} text-right font-mono font-semibold ${m.qty > 0 ? "text-emerald-600" : "text-rose-600"}`}>{m.qty > 0 ? "+" : ""}{num(m.qty)}</td>
                <td className={`${td} text-right font-mono font-bold text-slate-900`}>{num(m.balance)}</td>
                <td className={`${td} text-slate-600`}>{m.note}</td>
              </tr>
            ))}
            {!moves.length && <Empty cols={6} text="Belum ada adjustment pada periode ini." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
