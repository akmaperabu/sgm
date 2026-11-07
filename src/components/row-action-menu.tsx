"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

export function RowActionMenu({
  children,
  align = "right",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left?: number;
    right?: number;
    isUpwards: boolean;
  } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    // Check whether to open upwards or downwards
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < 220 && rect.top > 200;

    const top = openUpwards ? rect.top - 6 : rect.bottom + 6;

    if (align === "right") {
      setCoords({
        top,
        right: Math.max(8, window.innerWidth - rect.right),
        isUpwards: openUpwards,
      });
    } else {
      setCoords({
        top,
        left: Math.max(8, rect.left),
        isUpwards: openUpwards,
      });
    }
  };

  const handleToggle = () => {
    if (!open) {
      updatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-600/20 active:scale-95 ${open
            ? "border-blue-500 bg-blue-50 text-blue-700"
            : "border-slate-200/80 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        aria-label="Menu aksi"
        title="Menu aksi"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {/* Render menu through portal to document.body so overflow-x-auto NEVER clips the dropdown */}
      {mounted && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("[role='button']") || target.closest("button") || target.closest("a")) {
              setOpen(false);
            }
          }}
          style={coords ? {
            position: "fixed",
            top: coords.top,
            ...(coords.right !== undefined ? { right: coords.right } : { left: coords.left }),
            transform: coords.isUpwards ? "translateY(-100%)" : "none",
          } : undefined}
          className={`z-50 min-w-[210px] rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/15 text-xs text-slate-700 transition-all ${open ? "block opacity-100 scale-100" : "hidden opacity-0 scale-95 pointer-events-none"
            }`}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}
