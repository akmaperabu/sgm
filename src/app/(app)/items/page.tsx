import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { ViewDetailDialog, DetailSection, DetailItem } from "@/components/view-detail-dialog";
import { RowActionMenu } from "@/components/row-action-menu";
import { Badge, Empty, Field, StockBadge, btnPrimary, btnSecondary, inputCls, selectCls, stickyTd, stickyTh, table, tableWrap, td, th } from "@/components/ui";
import { ITEM_CATEGORIES, SITES, categoryLabel, siteLabel } from "@/lib/constants";
import { num } from "@/lib/format";
import { saveItem, toggleItem } from "@/actions/goods";
import { Eye, Pencil, Power, Search } from "lucide-react";

export default async function ItemsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);
  const q = (sp.q ?? "").trim();
  const cat = sp.cat ?? "";

  const cards = await prisma.inventoryStockCard.findMany({
    where: {
      ...ctx.siteWhere,
      periodId: ctx.period.id,
      item: {
        ...(cat && { category: cat }),
        ...(q && { OR: [{ name: { contains: q } }, { code: { contains: q } }] }),
      },
    },
    include: { item: true },
    orderBy: [{ siteId: "asc" }, { item: { code: "asc" } }],
  });

  return (
    <>
      <PageHeader
        ctx={ctx}
        sp={sp}
        title="Master Barang"
        actions={
          ctx.isAdmin && !ctx.readOnly ? (
            <FormDialog label="Tambah Barang" title="Tambah Barang Baru">
              <ItemForm defaultSite={ctx.writeSite} />
            </FormDialog>
          ) : null
        }
      />

      <div className="mb-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-xs">
        <form className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5" method="get">
          {sp.period && <input type="hidden" name="period" value={sp.period} />}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari kode atau nama barang..."
              aria-label="Cari barang"
              className={`${inputCls} pl-9`}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select name="cat" defaultValue={cat} aria-label="Kategori" className={`${selectCls} flex-1 sm:!w-44`}>
              <option value="">Semua Kategori</option>
              {ITEM_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <button className={`${btnSecondary} shrink-0`}>Filter Data</button>
          </div>
        </form>
      </div>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} ${stickyTh}`}>Barang</th>
              <th className={th}>Kode</th>
              <th className={th}>Kategori</th>
              {ctx.site === "ALL" && <th className={th}>Site</th>}
              <th className={th}>Satuan</th>
              <th className={`${th} text-right`}>Stok Awal</th>
              <th className={`${th} text-right`}>Masuk</th>
              <th className={`${th} text-right`}>Keluar</th>
              <th className={`${th} text-right`}>Adj.</th>
              <th className={`${th} text-right`}>Stok Akhir</th>
              <th className={`${th} text-right`}>Min</th>
              <th className={th}>Status</th>
              <th className={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => {
              const detailContent = (
                <div className="space-y-3.5">
                  <DetailSection title="Data Pokok Barang">
                    <DetailItem label="Nama Barang" value={c.item.name} highlight span2 />
                    <DetailItem label="Kode Barang" value={<span className="font-mono text-xs">{c.item.code}</span>} />
                    <DetailItem label="Kategori" value={categoryLabel(c.item.category)} />
                    <DetailItem label="Satuan Unit" value={c.item.unit} />
                    <DetailItem label="Site Penempatan" value={siteLabel(c.siteId)} />
                    <DetailItem
                      label="Status Barang"
                      value={
                        c.item.isActive ? (
                          <Badge tone="green" dot>Aktif Digunakan</Badge>
                        ) : (
                          <Badge tone="slate" dot={false}>Nonaktif</Badge>
                        )
                      }
                      span2
                    />
                  </DetailSection>

                  <DetailSection title={`Rekapitulasi Stok (Periode: ${ctx.period.periodName})`}>
                    <DetailItem label="Stok Awal Periode" value={`${num(c.openingStock)} ${c.item.unit}`} />
                    <DetailItem label="Total Masuk (IN)" value={<span className="text-emerald-700 font-semibold">{c.qtyIn ? `+${num(c.qtyIn)} ${c.item.unit}` : "0"}</span>} />
                    <DetailItem label="Total Keluar (OUT)" value={<span className="text-rose-700 font-semibold">{c.qtyOut ? `-${num(c.qtyOut)} ${c.item.unit}` : "0"}</span>} />
                    <DetailItem label="Penyesuaian (Adj)" value={`${c.qtyAdjust ? (c.qtyAdjust > 0 ? "+" : "") + num(c.qtyAdjust) : "0"} ${c.item.unit}`} />
                    <DetailItem
                      label="Stok Akhir Saat Ini"
                      value={<span className="text-base font-extrabold text-blue-700">{num(c.closingStock)} {c.item.unit}</span>}
                      highlight
                    />
                    <DetailItem label="Batas Stok Minimum" value={`${num(c.item.minStock)} ${c.item.unit}`} />
                    <DetailItem
                      label="Status Ketersediaan"
                      value={<StockBadge stock={c.closingStock} min={c.item.minStock} />}
                      span2
                    />
                  </DetailSection>
                </div>
              );

              return (
                <tr key={c.id} className={`group hover:bg-slate-50/70 transition-colors ${c.item.isActive ? "" : "opacity-60"}`}>
                  <td className={`${td} ${stickyTd}`}>
                    <ViewDetailDialog
                      title={`Detail Barang: ${c.item.name}`}
                      subtitle={`${c.item.code} • ${siteLabel(c.siteId)}`}
                      trigger={
                        <div className="text-left group/item flex items-center gap-2">
                          <span className="font-semibold text-slate-900 group-hover/item:text-blue-700 transition-colors underline-offset-2 hover:underline">
                            {c.item.name}
                          </span>
                          {!c.item.isActive && <Badge tone="slate" dot={false}>Nonaktif</Badge>}
                        </div>
                      }
                    >
                      {detailContent}
                    </ViewDetailDialog>
                  </td>
                  <td className={`${td} font-mono text-xs text-slate-500`}>{c.item.code}</td>
                  <td className={td}>{categoryLabel(c.item.category)}</td>
                  {ctx.site === "ALL" && <td className={td}>{siteLabel(c.siteId)}</td>}
                  <td className={`${td} text-slate-500`}>{c.item.unit}</td>
                  <td className={`${td} text-right font-mono text-slate-600`}>{num(c.openingStock)}</td>
                  <td className={`${td} text-right font-mono text-emerald-600 font-semibold`}>{c.qtyIn ? `+${num(c.qtyIn)}` : "-"}</td>
                  <td className={`${td} text-right font-mono text-rose-600 font-semibold`}>{c.qtyOut ? `-${num(c.qtyOut)}` : "-"}</td>
                  <td className={`${td} text-right font-mono text-slate-600`}>{c.qtyAdjust ? (c.qtyAdjust > 0 ? "+" : "") + num(c.qtyAdjust) : "-"}</td>
                  <td className={`${td} text-right font-mono font-semibold text-slate-900`}>{num(c.closingStock)}</td>
                  <td className={`${td} text-right font-mono text-slate-400`}>{num(c.item.minStock)}</td>
                  <td className={td}><StockBadge stock={c.closingStock} min={c.item.minStock} /></td>
                  <td className={td}>
                    <RowActionMenu>
                      <ViewDetailDialog
                        title={`Detail Barang: ${c.item.name}`}
                        subtitle={`${c.item.code} • ${siteLabel(c.siteId)}`}
                        trigger={
                          <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                            <Eye className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>Lihat Detail</span>
                          </div>
                        }
                      >
                        {detailContent}
                      </ViewDetailDialog>

                      {ctx.isAdmin && !ctx.readOnly && (
                        <>
                          <FormDialog
                            title={`Edit ${c.item.code}`}
                            trigger={
                              <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                                <Pencil className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                <span>Edit Barang</span>
                              </div>
                            }
                          >
                            <ItemForm item={c.item} />
                          </FormDialog>

                          <form action={toggleItem} className="w-full">
                            <input type="hidden" name="id" value={c.item.id} />
                            <button
                              type="submit"
                              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                                c.item.isActive
                                  ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                  : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              }`}
                            >
                              <Power className="h-3.5 w-3.5 shrink-0" />
                              <span>{c.item.isActive ? "Nonaktifkan Barang" : "Aktifkan Barang"}</span>
                            </button>
                          </form>
                        </>
                      )}
                    </RowActionMenu>
                  </td>
                </tr>
              );
            })}
            {!cards.length && <Empty cols={13} />}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Stok Akhir = Stok Awal + Masuk - Keluar + Adjustment. {ctx.readOnly ? "Menampilkan snapshot periode arsip." : ""}
      </p>
    </>
  );
}

function ItemForm({
  item,
  defaultSite,
}: {
  item?: { id: string; name: string; category: string; unit: string; minStock: number; code: string };
  defaultSite?: string;
}) {
  return (
    <form action={saveItem} className="grid gap-3 sm:grid-cols-2">
      {item && <input type="hidden" name="id" value={item.id} />}
      {!item && (
        <Field label="Site">
          <select name="siteId" defaultValue={defaultSite} className={selectCls}>
            {SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
      )}
      {!item && (
        <Field label="Kode (kosongkan = otomatis)">
          <input name="code" className={`${inputCls} font-mono uppercase`} placeholder="ATK-010" />
        </Field>
      )}
      <div className="sm:col-span-2">
        <Field label="Nama Barang">
          <input name="name" required defaultValue={item?.name} className={inputCls} />
        </Field>
      </div>
      <Field label="Kategori">
        <select name="category" defaultValue={item?.category ?? "ATK"} className={selectCls}>
          {ITEM_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Satuan">
        <input name="unit" required defaultValue={item?.unit ?? "pcs"} className={inputCls} />
      </Field>
      <Field label="Stok Minimum">
        <input name="minStock" type="number" min={0} required defaultValue={item?.minStock ?? 0} className={`${inputCls} font-mono`} />
      </Field>
      {!item && (
        <Field label="Stok Awal (opsional)">
          <input name="initial" type="number" min={0} defaultValue={0} className={`${inputCls} font-mono`} />
        </Field>
      )}
      <div className="sm:col-span-2 pt-2">
        <button className={btnPrimary}>Simpan Barang</button>
      </div>
    </form>
  );
}
