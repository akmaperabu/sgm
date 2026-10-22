"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Check, ChevronDown, PlusCircle } from "lucide-react";
import { inputCls } from "./ui";

export type SearchItemOption = {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
};

export function ItemSearchSelect({
  name = "itemId",
  items,
  defaultValue = "",
  value: controlledValue,
  onChange,
  required = true,
  placeholder = "Ketik nama atau kode barang...",
  allowNew = false,
  newLabel = "+ Tambah Barang Baru (Belum ada di master)",
}: {
  name?: string;
  items: SearchItemOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (id: string) => void;
  required?: boolean;
  placeholder?: string;
  allowNew?: boolean;
  newLabel?: string;
}) {
  const [selectedId, setSelectedId] = useState<string>(controlledValue ?? defaultValue);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setSelectedId(controlledValue);
    }
  }, [controlledValue]);

  const selectedItem = useMemo(() => {
    if (selectedId === "__NEW__") {
      return { id: "__NEW__", label: newLabel };
    }
    return items.find((i) => i.id === selectedId);
  }, [items, selectedId, newLabel]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.sublabel && i.sublabel.toLowerCase().includes(q))
    );
  }, [items, query]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setIsOpen(false);
    setQuery("");
    onChange?.(id);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedId("");
    setQuery("");
    onChange?.("");
    inputRef.current?.focus();
    setIsOpen(true);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input type="hidden" name={name} value={selectedId} />

      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />

        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : selectedItem ? selectedItem.label : query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          placeholder={selectedItem ? selectedItem.label : placeholder}
          required={required && !selectedId}
          autoComplete="off"
          className={`${inputCls} pl-10 pr-16 font-medium text-slate-900 ${
            selectedItem && !isOpen ? "bg-slate-50/80 font-semibold" : "bg-white"
          }`}
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {selectedId ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Hapus pilihan"
              className="rounded-full p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              if (!isOpen) inputRef.current?.focus();
            }}
            tabIndex={-1}
            className="rounded-full p-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {allowNew && (
            <button
              type="button"
              onClick={() => handleSelect("__NEW__")}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                selectedId === "__NEW__"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-blue-700 hover:bg-blue-50/70"
              }`}
            >
              <PlusCircle className="h-4 w-4 shrink-0 text-blue-700" />
              <span className="font-semibold">{newLabel}</span>
              {selectedId === "__NEW__" && <Check className="ml-auto h-4 w-4 shrink-0 text-blue-700" />}
            </button>
          )}

          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400">
              {query ? `Tidak ada barang yang cocok dengan "${query}"` : "Belum ada daftar barang."}
            </div>
          ) : (
            filtered.map((item) => {
              const isSel = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                    isSel
                      ? "bg-blue-50 text-blue-900 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="truncate font-semibold text-slate-900">{item.label}</div>
                    {item.sublabel && (
                      <div className="truncate text-[11px] text-slate-500 font-normal mt-0.5">
                        {item.sublabel}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {item.badge && (
                      <span className="rounded-md border border-slate-200 bg-slate-100/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {item.badge}
                      </span>
                    )}
                    {isSel && <Check className="h-4 w-4 text-blue-700" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
