"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";

export function ViewDetailDialog({
  title,
  subtitle,
  children,
  trigger,
  maxWidth = "w-[min(38rem,calc(100vw-1.5rem))]",
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
      className={`${maxWidth} m-auto rounded-2xl border border-slate-200/90 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-xs`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-3.5 bg-white">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 font-mono mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          aria-label="Tutup"
          onClick={() => ref.current?.close()}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[82vh] overflow-y-auto px-5 sm:px-6 py-5 text-xs text-slate-700 divide-y divide-slate-100">
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
    <div className="pt-4 first:pt-0 space-y-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">{children}</div>
    </div>
  );
}

export function DetailItem({
  label,
  value,
  span2 = false,
  highlight = false,
}: {
  label: string;
  value: ReactNode;
  span2?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={span2 ? "col-span-2" : "col-span-1"}>
      <span className="block text-[11px] font-medium text-slate-500 mb-0.5 leading-tight">
        {label}
      </span>
      <div
        className={`leading-relaxed ${
          highlight ? "font-semibold text-slate-900" : "font-normal text-slate-800"
        }`}
      >
        {value ?? "-"}
      </div>
    </div>
  );
}
