"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export function ToastNotification({ err, ok }: { err?: string; ok?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const queryErr = sp.get("err") || undefined;
  const queryOk = sp.get("ok") || undefined;
  const initialErr = err ?? queryErr;
  const initialOk = ok ?? queryOk;

  const [visible, setVisible] = useState(Boolean(initialErr || initialOk));
  const [currentErr, setCurrentErr] = useState<string | undefined>(initialErr);
  const [currentOk, setCurrentOk] = useState<string | undefined>(initialOk);

  const closeToast = useCallback(() => {
    setVisible(false);
    if (sp.has("err") || sp.has("ok")) {
      const q = new URLSearchParams(sp.toString());
      q.delete("err");
      q.delete("ok");
      const nextQuery = q.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [pathname, router, sp]);

  useEffect(() => {
    const nextErr = err ?? sp.get("err") ?? undefined;
    const nextOk = ok ?? sp.get("ok") ?? undefined;
    if (nextErr || nextOk) {
      setCurrentErr(nextErr);
      setCurrentOk(nextOk);
      setVisible(true);
      const timer = setTimeout(() => {
        closeToast();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [err, ok, sp, closeToast]);

  if (!visible || (!currentErr && !currentOk)) return null;

  const isError = Boolean(currentErr);
  const message = currentErr || currentOk;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_15px_35px_rgba(15,23,42,0.12)] transition-all animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="shrink-0 mt-0.5">
        {isError ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-4 ring-rose-50/50">
            <AlertCircle className="h-4 w-4" />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/50">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-xs font-bold text-slate-900">
          {isError ? "Terjadi Kendala" : "Berhasil Disimpan"}
        </div>
        <p className="mt-0.5 text-xs text-slate-600 leading-relaxed font-medium">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={closeToast}
        aria-label="Tutup notifikasi"
        className="shrink-0 rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
