"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";

export function ViewDetailDialog({
  title,
  subtitle,
  children,
  trigger,
  maxWidth = "w-[min(32rem,calc(100vw-1.5rem))]",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  trigger?: ReactNode;
  maxWidth?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dialogElement = (
    <dialog
      ref={ref}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className={`${maxWidth} ml-auto mr-3 my-auto h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] open:flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-xs`}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 bg-white">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug text-slate-900 tracking-tight break-words">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-slate-500 break-words">{subtitle}</p>}
        </div>
        <button
          type="button"
          aria-label="Tutup"
          onClick={() => ref.current?.close()}
          className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto text-[13px] text-slate-700 [&>div]:!space-y-0">
        {children}
      </div>
    </dialog>
  );

  return (
    <>
      {trigger ? (
        <span
          role="button"
          tabIndex={0}
          onClick={() => ref.current?.showModal()}
          onKeyDown={(e) => e.key === "Enter" && ref.current?.showModal()}
          className="cursor-pointer"
        >
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.showModal()}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Eye className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>Lihat Detail</span>
        </button>
      )}

      {mounted && typeof document !== "undefined"
        ? createPortal(dialogElement, document.body)
        : null}
    </>
  );
}

export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 px-6 py-5 last:border-b-0">
      <div className="mb-3.5 text-sm font-medium text-slate-500">{title}</div>
      <div className="grid grid-cols-[minmax(7rem,40%)_1fr] items-start gap-x-4 gap-y-3.5">{children}</div>
    </div>
  );
}

export function DetailItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: ReactNode;
  /** dipertahankan agar kompatibel; baris kini selalu label kiri - nilai kanan */
  span2?: boolean;
  highlight?: boolean;
}) {
  return (
    <>
      <span className="text-[13px] leading-snug text-slate-500">{label}</span>
      <div
        className={`min-w-0 break-words text-[13px] leading-snug ${highlight ? "font-semibold text-slate-900" : "font-medium text-slate-900"
          }`}
      >
        {value ?? "-"}
      </div>
    </>
  );
}
