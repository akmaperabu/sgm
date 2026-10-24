"use client";

import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Printer, X, FileText } from "lucide-react";
import { btnPrimary } from "./ui";

export interface SlipDetail {
  docNumber: string;
  docTitle: string; // "BUKTI PENGELUARAN BARANG (GOODS ISSUE)" | "BUKTI PENERIMAAN BARANG (GOODS RECEIPT)"
  date: string;
  siteName: string;
  requesterOrVendorLabel: string;
  requesterOrVendorValue: string;
  officerName: string;
  purposeOrRefLabel: string;
  purposeOrRefValue: string;
  items: Array<{
    code: string;
    name: string;
    category: string;
    unit: string;
    qty: number;
    price?: number | null;
    total?: number | null;
  }>;
  notes?: string | null;
  signatures: {
    firstTitle: string; // "Diserahkan Oleh" / "Diajukan Oleh"
    firstName?: string;
    secondTitle: string; // "Diterima Oleh" / "Disetujui Oleh"
    secondName?: string;
    thirdTitle?: string; // "Mengetahui / Supervisor" (opsional)
    thirdName?: string;
  };
}

export function PrintSlipDialog({
  detail,
  trigger,
  triggerLabel = "Cetak Bukti",
  iconOnly = false,
}: {
  detail: SlipDetail;
  trigger?: ReactNode;
  triggerLabel?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handlePrint = () => {
    window.print();
  };

  const renderTrigger = () => {
    if (trigger) {
      return (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              setOpen(true);
            }
          }}
          className="w-full text-left cursor-pointer"
        >
          {trigger}
        </div>
      );
    }

    if (iconOnly) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          title={triggerLabel}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
        >
          <Printer className="h-3.5 w-3.5" />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
      >
        <Printer className="h-3.5 w-3.5 text-slate-500" />
        <span>{triggerLabel}</span>
      </button>
    );
  };

  const hasThirdSig = Boolean(detail.signatures.thirdTitle);

  const modalContent = open ? (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs printable-slip-modal-backdrop animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden printable-slip-wrapper animate-in zoom-in-95 duration-200"
      >
        {/* Header Dialog (Hidden on Print) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-700" />
            <span className="text-sm font-bold text-slate-900">
              Pratinjau Cetak: {detail.docNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className={`${btnPrimary} !h-8 !px-3.5`}
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Cetak Sekarang
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Printable Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-slate-900 printable-slip bg-white">
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .printable-slip-modal-backdrop {
                position: static !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .printable-slip-wrapper {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
              }
              .printable-slip,
              .printable-slip * {
                visibility: visible !important;
              }
              .printable-slip {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10mm !important;
                box-shadow: none !important;
                background: white !important;
              }
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
            }
          `}</style>

          {/* Kop Surat Resmi PT. Ono Kreasi Gasindo */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 uppercase">
                  PT. Ono Kreasi Gasindo
                </h1>
                <p className="text-[11px] font-semibold text-slate-600">
                  Support Goods &amp; Maintenance System
                </p>
                <p className="text-[10px] text-slate-500">
                  Site Operasional: {detail.siteName}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block border border-slate-900 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider">
                  FORM DOKUMEN RESMI
                </span>
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  Waktu Cetak: {new Date().toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>

          {/* Judul Dokumen */}
          <div className="text-center my-3">
            <h2 className="text-sm font-black tracking-wide uppercase underline decoration-1 underline-offset-4">
              {detail.docTitle}
            </h2>
            <div className="mt-1 font-mono text-xs font-bold text-slate-800">
              No: {detail.docNumber}
            </div>
          </div>

          {/* Rincian Dokumen (Metadata) */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border border-slate-200 rounded-lg p-3 bg-slate-50/60 my-3.5">
            <div className="flex">
              <span className="w-32 text-slate-500 font-medium shrink-0">Tanggal Dokumen</span>
              <span className="font-semibold text-slate-800">: {detail.date}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500 font-medium shrink-0">Petugas Terkait</span>
              <span className="font-semibold text-slate-800">: {detail.officerName || "-"}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500 font-medium shrink-0">{detail.requesterOrVendorLabel}</span>
              <span className="font-semibold text-slate-800">: {detail.requesterOrVendorValue}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-500 font-medium shrink-0">{detail.purposeOrRefLabel}</span>
              <span className="font-semibold text-slate-800 truncate">: {detail.purposeOrRefValue}</span>
            </div>
          </div>

          {/* Tabel Barang */}
          <table className="w-full border-collapse border border-slate-300 text-xs my-4">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-300 px-2.5 py-1.5 text-center w-8">No</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-left w-24">Kode</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-left">Nama Barang / Spesifikasi</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-center w-20">Kategori</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-right w-16">Qty</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-center w-16">Satuan</th>
                {detail.items.some((i) => typeof i.price === "number") && (
                  <>
                    <th className="border border-slate-300 px-2.5 py-1.5 text-right w-24">Harga (Rp)</th>
                    <th className="border border-slate-300 px-2.5 py-1.5 text-right w-28">Total (Rp)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {detail.items.map((it, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="border border-slate-300 px-2.5 py-1.5 text-center font-mono">{idx + 1}</td>
                  <td className="border border-slate-300 px-2.5 py-1.5 font-mono text-[11px] font-semibold">{it.code}</td>
                  <td className="border border-slate-300 px-2.5 py-1.5 font-medium">{it.name}</td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-center">{it.category}</td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono font-bold">{it.qty}</td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-center">{it.unit}</td>
                  {detail.items.some((i) => typeof i.price === "number") && (
                    <>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono">
                        {typeof it.price === "number" ? Math.round(it.price).toLocaleString("id-ID") : "-"}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono font-bold">
                        {typeof it.total === "number" ? Math.round(it.total).toLocaleString("id-ID") : "-"}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {detail.notes && (
            <div className="text-[11px] text-slate-600 italic mb-4">
              * Catatan: {detail.notes}
            </div>
          )}

          {/* Kotak Tanda Tangan Resmi (2 Kolom jika PR/PO, 3 Kolom jika Goods Issue/Receipt) */}
          <div className={`${hasThirdSig ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-12 max-w-lg mx-auto"} text-center mt-8 pt-4 text-xs`}>
            <div className="flex flex-col justify-between h-28 border border-dashed border-slate-300 rounded p-2">
              <div className="font-semibold text-slate-700">{detail.signatures.firstTitle}</div>
              <div>
                <div className="border-b border-slate-400 mx-4" />
                <div className="font-bold text-slate-900 mt-1">
                  {detail.signatures.firstName || "(.............................)"}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between h-28 border border-dashed border-slate-300 rounded p-2">
              <div className="font-semibold text-slate-700">{detail.signatures.secondTitle}</div>
              <div>
                <div className="border-b border-slate-400 mx-4" />
                <div className="font-bold text-slate-900 mt-1">
                  {detail.signatures.secondName || "(.............................)"}
                </div>
              </div>
            </div>

            {hasThirdSig && (
              <div className="flex flex-col justify-between h-28 border border-dashed border-slate-300 rounded p-2">
                <div className="font-semibold text-slate-700">{detail.signatures.thirdTitle}</div>
                <div>
                  <div className="border-b border-slate-400 mx-4" />
                  <div className="font-bold text-slate-900 mt-1">
                    {detail.signatures.thirdName || "(.............................)"}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-[10px] text-slate-400 mt-6 border-t border-slate-200 pt-2 font-mono">
            PT. Ono Kreasi Gasindo • Support Goods &amp; Maintenance System
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {renderTrigger()}
      {mounted && typeof document !== "undefined" && modalContent
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
