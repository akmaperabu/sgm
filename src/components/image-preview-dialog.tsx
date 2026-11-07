"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";

export function ImagePreviewDialog({
  src,
  title = "Foto",
  trigger,
}: {
  src: string;
  title?: string;
  trigger: ReactNode;
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
      className="w-[min(56rem,calc(100vw-1.5rem))] m-auto rounded-2xl border border-slate-200/90 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-xs"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div className="flex items-center gap-1">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            title="Buka ukuran penuh di tab baru"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => ref.current?.close()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex max-h-[80vh] items-center justify-center overflow-auto bg-slate-50 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={title} className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain" />
      </div>
    </dialog>
  );

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={() => ref.current?.showModal()}
        onKeyDown={(e) => e.key === "Enter" && ref.current?.showModal()}
        className="cursor-pointer"
      >
        {trigger}
      </span>
      {mounted ? createPortal(dialogElement, document.body) : null}
    </>
  );
}

