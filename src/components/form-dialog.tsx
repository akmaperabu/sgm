"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { btnPrimary, btnSecondary } from "./ui";

export function FormDialog({
  label,
  title,
  children,
  variant = "primary",
  small,
  icon = true,
  trigger,
}: {
  label?: string;
  title: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  small?: boolean;
  icon?: boolean;
  trigger?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const base = variant === "primary" ? btnPrimary : btnSecondary;

  useEffect(() => {
    setMounted(true);
  }, []);

  const dialogElement = (
    <dialog
      ref={ref}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      onSubmit={() => {
        setTimeout(() => {
          ref.current?.close();
        }, 80);
      }}
      className="w-[min(34rem,calc(100vw-1.5rem))] m-auto rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-xs"
    >
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 sm:px-5 py-3 sm:py-3.5">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <button
          type="button"
          aria-label="Tutup"
          onClick={() => ref.current?.close()}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 active:scale-95 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[82vh] overflow-y-auto p-4 sm:p-5">{children}</div>
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
          className="w-full cursor-pointer"
        >
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.showModal()}
          className={`${base} ${small ? "!h-8 !px-3 !text-xs" : ""}`}
        >
          {icon && <Plus className="h-4 w-4" />}
          {label}
        </button>
      )}

      {mounted && typeof document !== "undefined"
        ? createPortal(dialogElement, document.body)
        : null}
    </>
  );
}
