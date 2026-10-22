"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Archive,
  SlidersHorizontal, Wrench, Siren, CalendarClock, Factory, Settings, Menu, X, LogOut,
  Search, MapPin, History, Activity
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { SITES } from "@/lib/constants";
import { SiteSwitcher } from "./site-switcher";
import { ToastNotification } from "./toast-notification";

type Item = { href: string; label: string; icon: typeof Package; adminOnly?: boolean };
type Group = { title?: string; icon?: typeof Package; items: Item[] };

const NAV: Group[] = [
  { items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Support Goods",
    icon: Package,
    items: [
      { href: "/goods-receipt", label: "Penerimaan Barang", icon: ArrowDownToLine },
      { href: "/goods-issue", label: "Pengambilan Barang", icon: ArrowUpFromLine },
      { href: "/purchasing", label: "Pembelian (PR/PO)", icon: RefreshCw },
      { href: "/transactions", label: "Riwayat Transaksi", icon: History },
      { href: "/items", label: "Master Barang", icon: Archive },
      { href: "/stock-adjustment", label: "Stock Adjustment", icon: SlidersHorizontal, adminOnly: true },
    ],
  },
  {
    title: "Maintenance & Aset",
    icon: Wrench,
    items: [
      { href: "/maintenance", label: "Monitoring Hub", icon: Activity },
      { href: "/maintenance/schedule", label: "Jadwal Maintenance", icon: CalendarClock },
      { href: "/maintenance/requests", label: "Request Maintenance", icon: Siren },
      { href: "/maintenance/assets", label: "Master Aset", icon: Factory },
    ],
  },
  { items: [{ href: "/settings", label: "Kelola Pengguna", icon: Settings, adminOnly: true }] },
];

export function AppShell({
  user,
  site,
  children,
}: {
  user: { name: string; role: string; siteId: string | null };
  site: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";

  const nav = (
    <nav className="flex-1 space-y-4 overflow-y-auto px-1 py-2" aria-label="Navigasi utama">
      {NAV.map((g, gi) => (
        <div key={gi} className="space-y-1">
          {g.title && (
            <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {g.title}
            </div>
          )}
          {g.items
            .filter((i) => !i.adminOnly || isAdmin)
            .map((i) => {
              const active = i.href === "/" || i.href === "/maintenance" ? pathname === i.href : pathname.startsWith(i.href);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs transition-all ${active
                    ? "bg-white font-bold text-blue-700 shadow-sm shadow-slate-200/80"
                    : "font-medium text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                    }`}
                >
                  <i.icon
                    className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${active ? "text-blue-700" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                  />
                  <span className="truncate">{i.label}</span>
                  {active && (
                    <span className="absolute right-0 top-2 bottom-2 w-1.5 rounded-l-full bg-blue-700" />
                  )}
                </Link>
              );
            })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50/60 antialiased text-slate-900">
      <aside className="hidden w-64 shrink-0 lg:flex lg:flex-col lg:justify-between h-screen border-r border-slate-200/80 bg-white p-4 z-20">
        <div className="flex flex-col min-h-0 flex-1">
          <Brand />
          <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
            {nav}
          </div>
        </div>

        <div className="mt-3 shrink-0 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white shadow-xs ring-2 ring-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-slate-900">{user.name}</div>
              <div className="truncate text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                {user.role} • {user.siteId ?? "Pusat"}
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Keluar"
                aria-label="Keluar / Logout"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col justify-between border-r border-slate-200 bg-white p-4 shadow-2xl">
            <div className="flex flex-col min-h-0 flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <Brand />
                <button
                  aria-label="Tutup menu"
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 flex-1 min-h-0 overflow-y-auto pr-1">{nav}</div>
            </div>
            <div className="mt-3 shrink-0 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-slate-900">{user.name}</div>
                  <div className="truncate text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    {user.role} • {user.siteId ?? "Pusat"}
                  </div>
                </div>
              </div>
              <form action={logoutAction} className="shrink-0">
                <button
                  type="submit"
                  title="Keluar"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        <header className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-10 sticky top-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              aria-label="Buka menu"
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs lg:hidden hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            <div className="lg:hidden flex items-center">
              <img
                src="/logo.png"
                alt="SGM"
                className="h-7 w-auto max-w-[130px] sm:max-w-[170px] object-contain"
              />
            </div>

            <div className="relative hidden md:flex items-center">
              <Search className="pointer-events-none absolute left-3.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari barang, nomor PO/PR, aset..."
                aria-label="Pencarian cepat"
                className="h-9 w-64 md:w-80 rounded-full border border-slate-200 bg-slate-50/60 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin ? (
              <SiteSwitcher currentSite={site} sites={SITES} />
            ) : (
              <div className="inline-flex h-9 items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 bg-white px-2.5 sm:px-3.5 text-xs font-semibold text-slate-700 shadow-xs">
                <MapPin className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-none">{SITES.find((s) => s.id === user.siteId)?.label}</span>
              </div>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-7 space-y-4 sm:space-y-6 pb-20 lg:pb-7">
          {children}
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-1.5 py-1">
        <div className="flex items-center justify-around">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              pathname === "/" ? "text-blue-700 font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5 mb-0.5" />
            <span className="text-[10px]">Home</span>
          </Link>

          <Link
            href="/goods-receipt"
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              pathname.startsWith("/goods-receipt") ? "text-blue-700 font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ArrowDownToLine className="h-4.5 w-4.5 mb-0.5" />
            <span className="text-[10px]">Masuk</span>
          </Link>

          <Link
            href="/goods-issue"
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              pathname.startsWith("/goods-issue") ? "text-blue-700 font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ArrowUpFromLine className="h-4.5 w-4.5 mb-0.5" />
            <span className="text-[10px]">Keluar</span>
          </Link>

          <Link
            href="/transactions"
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              pathname.startsWith("/transactions") ? "text-blue-700 font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <History className="h-4.5 w-4.5 mb-0.5" />
            <span className="text-[10px]">Riwayat</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-900 transition-all active:scale-95"
          >
            <Menu className="h-4.5 w-4.5 mb-0.5" />
            <span className="text-[10px]">Menu</span>
          </button>
        </div>
      </div>

      <Suspense fallback={null}>
        <ToastNotification />
      </Suspense>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center px-1 py-1 group">
      <img
        src="/logo.png"
        alt="SGM Support Goods & Maintenance"
        className="h-9 w-auto max-w-[200px] object-contain transition-transform group-hover:scale-[1.02]"
      />
    </Link>
  );
}
