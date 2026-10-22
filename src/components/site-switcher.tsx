"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { setSiteAction } from "@/actions/auth";

type SiteOpt = { id: string; label: string };

export function SiteSwitcher({
  currentSite,
  sites,
}: {
  currentSite: string;
  sites: readonly SiteOpt[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  const activeLabel =
    currentSite === "ALL"
      ? "Semua Site"
      : sites.find((s) => s.id === currentSite)?.label ?? "Semua Site";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    setIsOpen(false);
    if (val === currentSite) return;
    const fd = new FormData();
    fd.append("site", val);
    startTransition(async () => {
      await setSiteAction(fd);
    });
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-700/20 active:scale-95 ${
          isOpen ? "ring-2 ring-blue-700/20 border-blue-700/40" : ""
        }`}
      >
        <MapPin className="h-3.5 w-3.5 text-blue-700 shrink-0" />
        <span className="truncate max-w-[120px]">{activeLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_15px_35px_rgba(15,23,42,0.12)] z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Pilih Lokasi Site
          </div>

          <button
            type="button"
            onClick={() => handleSelect("ALL")}
            className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors ${
              currentSite === "ALL"
                ? "bg-blue-50 text-blue-700 font-bold"
                : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-900"
            }`}
          >
            <span>Semua Site</span>
            {currentSite === "ALL" && <Check className="h-3.5 w-3.5 text-blue-700" />}
          </button>

          {sites.map((s) => {
            const isSelected = currentSite === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.id)}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <span>{s.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-blue-700" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
