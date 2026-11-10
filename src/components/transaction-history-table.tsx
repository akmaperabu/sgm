"use client";

import { useState, useMemo } from "react";
import { Download, Search, ChevronLeft, ChevronRight, Eye, Camera } from "lucide-react";
import { Badge, Empty, btnSecondary, inputCls, selectCls, table, tableWrap, td, th } from "./ui";
import { ViewDetailDialog, DetailSection, DetailItem } from "./view-detail-dialog";
import { categoryLabel, siteLabel } from "@/lib/constants";
import { fmtDateTime, num } from "@/lib/format";

export type MovementItem = {
  id: string;
  createdAt: string;
  type: string; // IN | OUT | ADJUST
  qty: number;
  balance: number;
  refType: string | null;
  refNo: string | null;
  note: string | null;
  photoUrl?: string | null;
  siteId: string;
  item: {
    code: string;
    name: string;
    category: string;
    unit: string;
  };
  user: {
    name: string;
    role: string;
  } | null;
};

export function TransactionHistoryTable({
  data,
  site,
  periodName,
}: {
  data: MovementItem[];
  site: string;
  periodName: string;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [siteFilter, setSiteFilter] = useState<string>("ALL");
  const [pageSize, setPageSize] = useState<number | "ALL">(25);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    return data.filter((m) => {
      if (typeFilter !== "ALL" && m.type !== typeFilter) return false;
      if (siteFilter !== "ALL" && m.siteId !== siteFilter) return false;

      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      const code = m.item.code.toLowerCase();
      const name = m.item.name.toLowerCase();
      const ref = (m.refNo ?? "").toLowerCase();
      const note = (m.note ?? "").toLowerCase();
      const user = (m.user?.name ?? "").toLowerCase();
      return (
        code.includes(q) ||
        name.includes(q) ||
        ref.includes(q) ||
        note.includes(q) ||
        user.includes(q)
      );
    });
  }, [data, query, typeFilter, siteFilter]);

  const totalItems = filtered.length;
  const isAll = pageSize === "ALL";
  const limit = isAll ? totalItems : pageSize;
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (isAll) return filtered;
    const start = (safePage - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, safePage, limit, isAll]);

  function handleExportCSV() {
    const headers = [
      "No",
      "Tanggal & Waktu",
      "Jenis Transaksi",
      "Kode Barang",
      "Nama Barang",
      "Kategori",
      "Site",
      "Qty",
      "Satuan",
      "Saldo Akhir",
      "Tipe Dokumen",
      "No. Dokumen / Referensi",
      "Catatan",
      "Operator",
    ];

    const rows = filtered.map((m, idx) => {
      const typeLabel =
        m.type === "IN" ? "Barang Masuk" : m.type === "OUT" ? "Barang Keluar" : "Adjustment";
      const sign = m.type === "IN" ? "+" : m.type === "OUT" ? "-" : m.qty > 0 ? "+" : "";
      return [
        idx + 1,
        `"${fmtDateTime(m.createdAt)}"`,
        `"${typeLabel}"`,
        `"${m.item.code}"`,
        `"${m.item.name.replace(/"/g, '""')}"`,
        `"${categoryLabel(m.item.category)}"`,
        `"${siteLabel(m.siteId)}"`,
        `"${sign}${m.qty}"`,
        `"${m.item.unit}"`,
        m.balance,
        `"${m.refType}"`,
        `"${m.refNo ?? "-"}"`,
        `"${(m.note ?? "-").replace(/"/g, '""')}"`,
        `"${m.user?.name ?? "-"}"`,
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Laporan_Transaksi_${periodName}_${site}_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-3 sm:top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari barang, no ref, catatan..."
              className={`${inputCls} !h-10 sm:!h-9 pl-9 text-sm sm:text-xs`}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0">
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/60 text-xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("ALL");
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors ${typeFilter === "ALL" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("IN");
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors ${typeFilter === "IN" ? "bg-white text-emerald-700 shadow-xs font-semibold" : "text-slate-600 hover:text-emerald-700"
                  }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("OUT");
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors ${typeFilter === "OUT" ? "bg-white text-rose-700 shadow-xs font-semibold" : "text-slate-600 hover:text-rose-700"
                  }`}
              >
                Keluar
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("ADJUST");
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors ${typeFilter === "ADJUST" ? "bg-white text-blue-700 shadow-xs font-semibold" : "text-slate-600 hover:text-blue-700"
                  }`}
              >
                Penyesuaian
              </button>
            </div>

            {site === "ALL" && (
              <select
                value={siteFilter}
                onChange={(e) => {
                  setSiteFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`${selectCls} !h-10 sm:!h-9 !w-32 sm:!w-36 text-sm sm:text-xs shrink-0`}
              >
                <option value="ALL">Semua Site</option>
                <option value="BATULICIN">Batulicin</option>
                <option value="TANJUNG">Tanjung</option>
                <option value="KENDARI">Kendari</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Baris:</span>
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/60">
              {[10, 25, 50, "ALL"].map((size) => {
                const active = pageSize === size;
                return (
                  <button
                    key={String(size)}
                    type="button"
                    onClick={() => {
                      setPageSize(size as number | "ALL");
                      setCurrentPage(1);
                    }}
                    className={`rounded-lg px-2 sm:px-2 py-1 text-xs font-semibold transition-colors ${active
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    {size === "ALL" ? "All" : size}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className={`${btnSecondary} !h-9 !px-3 sm:!px-3.5 !text-xs gap-1.5 font-semibold text-slate-700 hover:text-blue-700 hover:border-blue-300 active:scale-95`}
            title="Download file CSV (Excel-ready)"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>Tanggal &amp; Waktu</th>
              <th className={th}>Tipe</th>
              <th className={th}>Barang</th>
              <th className={th}>Kategori</th>
              {site === "ALL" && <th className={th}>Site</th>}
              <th className={`${th} text-right`}>Jumlah</th>
              <th className={`${th} text-right`}>Saldo Akhir</th>
              <th className={th}>Referensi</th>
              <th className={th}>Catatan</th>
              <th className={th}>Operator</th>
              <th className={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((m) => {
              const isEnter = m.type === "IN";
              const isExit = m.type === "OUT";
              const isAdj = m.type === "ADJUST";

              const detailContent = (
                <div className="space-y-4">
                  <DetailSection title="Rincian Mutasi Stok">
                    <DetailItem label="Waktu Transaksi" value={fmtDateTime(m.createdAt)} />
                    <DetailItem
                      label="Tipe Mutasi"
                      value={
                        isEnter ? (
                          <Badge tone="green" dot>Barang Masuk (IN)</Badge>
                        ) : isExit ? (
                          <Badge tone="red" dot>Barang Keluar (OUT)</Badge>
                        ) : (
                          <Badge tone="blue" dot>Penyesuaian (ADJUST)</Badge>
                        )
                      }
                    />
                    <DetailItem
                      label="Jumlah Perubahan"
                      value={
                        <span className="font-semibold font-mono text-slate-900">
                          {isEnter ? `+${num(m.qty)}` : isExit ? `-${num(m.qty)}` : `${m.qty > 0 ? "+" : ""}${num(m.qty)}`} {m.item.unit}
                        </span>
                      }
                    />
                    <DetailItem
                      label="Saldo Stok Setelah Transaksi"
                      value={<span className="font-semibold font-mono text-slate-900">{num(m.balance)} {m.item.unit}</span>}
                    />
                    <DetailItem label="Site Penempatan" value={siteLabel(m.siteId)} />
                    <DetailItem label="Operator / Petugas" value={m.user ? `${m.user.name} (${m.user.role})` : "-"} />
                  </DetailSection>

                  <DetailSection title="Data Barang Terkait">
                    <DetailItem label="Nama Barang" value={m.item.name} highlight span2 />
                    <DetailItem label="Kode Barang" value={<span className="font-mono text-slate-700">{m.item.code}</span>} />
                    <DetailItem label="Kategori" value={categoryLabel(m.item.category)} />
                    <DetailItem label="Satuan Unit" value={m.item.unit} />
                  </DetailSection>

                  <DetailSection title="Referensi Dokumen & Keterangan">
                    <DetailItem label="Tipe Referensi" value={m.refType || "-"} />
                    <DetailItem label="Keperluan / No. Ref" value={<span className="font-mono text-slate-800">{m.refNo || "-"}</span>} />
                    <DetailItem label="Keterangan Transaksi" value={m.note || "-"} span2 />
                    {m.photoUrl && (
                      <DetailItem
                        label="Lampiran Nota / Invoice"
                        value={
                          <a href={m.photoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-700 hover:underline font-medium">
                            <Camera className="h-3.5 w-3.5" /> Lihat Foto Nota / Invoice
                          </a>
                        }
                        span2
                      />
                    )}
                  </DetailSection>
                </div>
              );

              return (
                <tr key={m.id} className="group hover:bg-slate-50/70 transition-colors">
                  <td className={`${td} font-mono text-xs text-slate-600`}>
                    {fmtDateTime(m.createdAt)}
                  </td>
                  <td className={td}>
                    {isEnter && <Badge tone="green" dot>Masuk</Badge>}
                    {isExit && <Badge tone="red" dot>Keluar</Badge>}
                    {isAdj && <Badge tone="blue" dot>Penyesuaian</Badge>}
                  </td>
                  <td className={td}>
                    <ViewDetailDialog
                      title={`Detail Transaksi: ${m.item.name}`}
                      subtitle={`${m.item.code} • ${fmtDateTime(m.createdAt)}`}
                      trigger={
                        <div className="text-left group/item cursor-pointer">
                          <div className="font-semibold text-slate-900 group-hover/item:text-blue-700 transition-colors underline-offset-2 hover:underline">
                            {m.item.name}
                          </div>
                          <div className="font-mono text-xs text-slate-400 mt-0.5">{m.item.code}</div>
                        </div>
                      }
                    >
                      {detailContent}
                    </ViewDetailDialog>
                  </td>
                  <td className={td}>{categoryLabel(m.item.category)}</td>
                  {site === "ALL" && <td className={td}>{siteLabel(m.siteId)}</td>}
                  <td className={`${td} text-right font-mono font-medium text-slate-800`}>
                    <span>
                      {isEnter ? `+${num(m.qty)}` : isExit ? `-${num(m.qty)}` : `${m.qty > 0 ? "+" : ""}${num(m.qty)}`}
                    </span>{" "}
                    <span className="text-[11px] font-normal text-slate-400">{m.item.unit}</span>
                  </td>
                  <td className={`${td} text-right font-mono font-bold text-slate-900`}>
                    {num(m.balance)}
                  </td>
                  <td className={`${td} text-xs`}>
                    <span className="font-mono font-medium text-slate-800">
                      {m.refType}
                      {m.refNo ? ` / ${m.refNo}` : ""}
                    </span>
                  </td>
                  <td className={`${td} text-xs text-slate-600 max-w-64 leading-relaxed`}>
                    <div>{m.note || "-"}</div>
                    {m.photoUrl && (
                      <a
                        href={m.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-slate-50 transition-colors shadow-2xs mt-1"
                      >
                        <Camera className="h-3 w-3" />
                        <span>Foto Nota</span>
                      </a>
                    )}
                  </td>
                  <td className={`${td} text-xs text-slate-600`}>
                    {m.user?.name || "-"}
                  </td>
                  <td className={td}>
                    <ViewDetailDialog
                      title={`Detail Transaksi: ${m.item.name}`}
                      subtitle={`${m.item.code} • ${fmtDateTime(m.createdAt)}`}
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
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <Empty
                cols={site === "ALL" ? 11 : 10}
                text="Tidak ada data riwayat transaksi yang cocok."
              />
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-1 text-xs text-slate-500">
        <div className="text-center sm:text-left">
          Menampilkan{" "}
          <strong className="text-slate-800">
            {totalItems === 0
              ? 0
              : isAll
                ? `1 - ${totalItems}`
                : `${(safePage - 1) * limit + 1} - ${Math.min(safePage * limit, totalItems)}`}
          </strong>{" "}
          dari <strong className="text-slate-800">{totalItems}</strong> transaksi
        </div>

        {!isAll && totalPages > 1 && (
          <div className="flex items-center justify-center flex-wrap gap-1 sm:gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 sm:px-2.5 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - safePage) <= 1
                )
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  const isCur = p === safePage;

                  return (
                    <div key={p} className="flex items-center gap-1">
                      {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition-all ${isCur
                          ? "bg-blue-700 text-white shadow-xs"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                      >
                        {p}
                      </button>
                    </div>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 sm:px-2.5 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
