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
  requesterLabel: string;
  requesterValue: string;
  officerName: string;
  purposeOrRefLabel: string;
  purposeOrRefValue: string;
  items: Array<{
    code: string;
    name: string;
    category: string;
    unit: string;
    qty: number;
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
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-800" />
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

        {/* Content Printable Area - Single Page & Footer di Paling Bawah */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 text-black printable-slip bg-white flex flex-col justify-between min-h-[580px]">
          <style jsx global>{`
            @media print {
              /* 1. Sembunyikan SEMUA elemen body di luar modal cetak */
              body > *:not(.printable-slip-modal-backdrop) {
                display: none !important;
              }

              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: 100% !important;
                min-height: 100% !important;
                overflow: hidden !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              .printable-slip-modal-backdrop {
                position: static !important;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: #ffffff !important;
                overflow: hidden !important;
              }

              .printable-slip-wrapper {
                position: static !important;
                display: block !important;
                width: 100% !important;
                height: 100% !important;
                max-width: 100% !important;
                max-height: none !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: #ffffff !important;
                overflow: hidden !important;
              }

              .printable-slip {
                position: relative !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                width: 100% !important;
                height: 100% !important;
                min-height: 265mm !important;
                max-height: 275mm !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                background: #ffffff !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
                break-inside: avoid !important;
                break-after: avoid !important;
              }

              .printable-slip,
              .printable-slip * {
                visibility: visible !important;
                color: #000000 !important;
                border-color: #000000 !important;
                text-shadow: none !important;
                box-shadow: none !important;
              }

              @page {
                size: A4 portrait;
                margin: 10mm 12mm;
              }
            }
          `}</style>

          {/* Konten Utama Dokumen */}
          <div>
            {/* Kop Surat Resmi PT. Ono Kreasi Gasindo */}
            <div className="pb-2 mb-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src="/Logo OKG.png"
                    alt="Logo PT OKG"
                    className="h-14 w-14 sm:h-16 sm:w-16 object-contain shrink-0"
                  />
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-black uppercase leading-tight">
                      PT. ONO KREASI GASINDO
                    </h1>
                    <p className="text-[11px] font-bold text-black uppercase tracking-wide mt-0.5">
                      Support Goods &amp; Maintenance (SGM) System
                    </p>
                    <p className="text-[10px] text-black mt-0.5">
                      Site Operasional: <span className="font-bold">{detail.siteName}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block border-2 border-black px-2.5 py-1 text-[9.5px] font-mono font-black uppercase tracking-wider text-black">
                    FORM DOKUMEN RESMI
                  </span>
                  <p className="text-[9.5px] font-mono text-black mt-1.5">
                    Waktu Cetak: {new Date().toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
              {/* Garis Ganda Kop Surat Resmi Perusahaan */}
              <div className="border-b-2 border-black mt-2.5" />
              <div className="border-b border-black mt-0.5" />
            </div>

            {/* Judul Dokumen */}
            <div className="text-center my-2">
              <h2 className="text-xs sm:text-sm font-black tracking-wide uppercase text-black underline decoration-1 underline-offset-2">
                {detail.docTitle}
              </h2>
              <div className="mt-0.5 font-mono text-xs font-bold text-black break-words">
                NO: {detail.docNumber}
              </div>
            </div>

            {/* Rincian Dokumen (Metadata) - Compact & Tanpa Pemotongan Info */}
            <div className="border border-black rounded-xs mb-2.5 text-[11px] divide-y divide-black bg-white">
              {/* Baris 1: Tanggal & Site */}
              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="flex items-start py-1 px-2.5">
                  <span className="w-28 text-black font-bold shrink-0">Tanggal Dokumen</span>
                  <span className="text-black font-semibold break-words flex-1">: {detail.date}</span>
                </div>
                <div className="flex items-start py-1 px-2.5">
                  <span className="w-28 text-black font-bold shrink-0">Site Operasional</span>
                  <span className="text-black font-semibold break-words flex-1">: {detail.siteName}</span>
                </div>
              </div>

              {/* Baris 2: Pemohon/Penerima & Petugas */}
              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="flex items-start py-1 px-2.5">
                  <span className="w-28 text-black font-bold shrink-0">
                    {detail.requesterLabel || "Pemohon (Requester)"}
                  </span>
                  <span className="text-black font-semibold break-words flex-1">
                    : {detail.requesterValue || "-"}
                  </span>
                </div>
                <div className="flex items-start py-1 px-2.5">
                  <span className="w-28 text-black font-bold shrink-0">Petugas Terkait</span>
                  <span className="text-black font-semibold break-words flex-1">: {detail.officerName || "-"}</span>
                </div>
              </div>

              {/* Baris 3: Keterangan / Keperluan / No. PO (Full Width, Zero Truncation!) */}
              <div className="flex items-start py-1.5 px-2.5 bg-neutral-50/60">
                <span className="w-28 text-black font-bold shrink-0">{detail.purposeOrRefLabel}</span>
                <span className="text-black font-semibold break-words flex-1 leading-normal">
                  : {detail.purposeOrRefValue || "-"}
                </span>
              </div>
            </div>

            {/* Tabel Barang - Hitam Semua & Compact */}
            <table className="w-full border-collapse border border-black text-[11px] my-2.5">
              <thead>
                <tr className="bg-neutral-100 text-black border-b border-black">
                  <th className="border border-black px-2 py-1 text-center w-7 font-bold">No</th>
                  <th className="border border-black px-2 py-1 text-left w-24 font-bold">Kode</th>
                  <th className="border border-black px-2 py-1 text-left font-bold">Nama Barang / Spesifikasi</th>
                  <th className="border border-black px-2 py-1 text-center w-20 font-bold">Kategori</th>
                  <th className="border border-black px-2 py-1 text-right w-14 font-bold">Qty</th>
                  <th className="border border-black px-2 py-1 text-center w-14 font-bold">Satuan</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it, idx) => (
                  <tr key={idx} className="border-b border-black">
                    <td className="border border-black px-2 py-1 text-center font-mono text-black">{idx + 1}</td>
                    <td className="border border-black px-2 py-1 font-mono text-[10.5px] font-bold text-black break-words">{it.code}</td>
                    <td className="border border-black px-2 py-1 font-medium text-black break-words leading-tight">{it.name}</td>
                    <td className="border border-black px-2 py-1 text-center text-black">{it.category}</td>
                    <td className="border border-black px-2 py-1 text-right font-mono font-bold text-black">{it.qty}</td>
                    <td className="border border-black px-2 py-1 text-center text-black">{it.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {detail.notes && (
              <div className="text-[10px] text-black mb-2.5 border border-black bg-neutral-50/50 p-2 rounded-xs break-words">
                <span className="font-bold">Catatan:</span> {detail.notes}
              </div>
            )}

            {/* Area Tanda Tangan Resmi - Tanpa Kotak Border, Lahan TTD Nyaman (h-28) */}
            <div className={`${hasThirdSig ? "grid grid-cols-3 gap-6" : "grid grid-cols-2 gap-16 max-w-lg mx-auto"} text-center mt-6 text-xs`}>
              <div className="flex flex-col justify-between h-28">
                <div className="font-semibold text-black text-xs">{detail.signatures.firstTitle}</div>
                {/* Lahan kosong leluasa untuk tanda tangan fisik */}
                <div className="my-auto" />
                <div>
                  <div className="border-b border-black mx-4 sm:mx-6" />
                  <div className="font-bold text-black mt-1.5 text-xs break-words">
                    {detail.signatures.firstName || "( ............................. )"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between h-28">
                <div className="font-semibold text-black text-xs">{detail.signatures.secondTitle}</div>
                {/* Lahan kosong leluasa untuk tanda tangan fisik */}
                <div className="my-auto" />
                <div>
                  <div className="border-b border-black mx-4 sm:mx-6" />
                  <div className="font-bold text-black mt-1.5 text-xs break-words">
                    {detail.signatures.secondName || "( ............................. )"}
                  </div>
                </div>
              </div>

              {hasThirdSig && (
                <div className="flex flex-col justify-between h-28">
                  <div className="font-semibold text-black text-xs">{detail.signatures.thirdTitle}</div>
                  {/* Lahan kosong leluasa untuk tanda tangan fisik */}
                  <div className="my-auto" />
                  <div>
                    <div className="border-b border-black mx-4 sm:mx-6" />
                    <div className="font-bold text-black mt-1.5 text-xs break-words">
                      {detail.signatures.thirdName || "( ............................. )"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Garis Akhir / Penutup Dokumen Konsisten di Paling Bawah Halaman */}
          <div className="mt-auto pt-3 border-t border-black text-center text-[9.5px] text-black font-mono">
            PT. Ono Kreasi Gasindo • Support Goods &amp; Maintenance (SGM) System
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
