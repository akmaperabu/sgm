"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarRange, ChevronDown, Check, Lock, Archive } from "lucide-react";

type P = { periodName: string; label: string; isActive: boolean };

export function PeriodSelector({
  periods,
  current,
  isAdmin,
}: {
  periods: P[];
  current: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cur = periods.find((p) => p.periodName === current);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (periodName: string) => {
    setIsOpen(false);
    if (periodName === current) return;
    const q = new URLSearchParams(sp.toString());
    q.delete("err");
    q.delete("ok");
    q.set("period", periodName);
    router.push(`${pathname}?${q.toString()}`);
  };

  if (!isAdmin) {
    return (
      <div className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm">
        <Lock className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400">Periode Aktif:</span>
        <span className="text-slate-900">{cur?.label}</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-700/20 active:scale-95 ${
          isOpen ? "ring-2 ring-blue-700/20 border-blue-700/40" : ""
        }`}
      >
        <CalendarRange className="h-3.5 w-3.5 text-blue-700 shrink-0" />
        <span>
          {cur?.isActive ? (
            <span>
              <span className="text-slate-400 font-normal mr-1">Aktif:</span>
              <strong className="text-slate-900">{cur?.label}</strong>
            </span>
          ) : (
            <span>
              <span className="text-amber-700 font-semibold mr-1">Arsip:</span>
              <strong className="text-slate-900">{cur?.label}</strong>
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_15px_35px_rgba(15,23,42,0.12)] z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            <span>Pilihan Periode &amp; Arsip</span>
            <span className="text-[9px] lowercase font-normal text-slate-400">cut-off bulanan</span>
          </div>

          <div className="space-y-0.5">
            {periods.map((p) => {
              const isSelected = current === p.periodName;
              return (
                <button
                  key={p.periodName}
                  type="button"
                  onClick={() => handleSelect(p.periodName)}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {p.isActive ? (
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                    ) : (
                      <Archive className="h-3 w-3 text-slate-400" />
                    )}
                    <span className="font-medium text-slate-800">{p.label}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                        p.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.isActive ? "Aktif" : "Closed"}
                    </span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-blue-700" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
