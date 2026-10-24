"use client";

import { useState, useActionState } from "react";
import { loginAction, registerAction } from "@/actions/auth";
import { SITES } from "@/lib/constants";
import { Eye, EyeOff, AlertCircle, Info, X } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, undefined);
  const [registerState, registerFormAction, registerPending] = useActionState(registerAction, undefined);

  const error = mode === "login" ? loginState?.error : registerState?.error;
  const isPending = mode === "login" ? loginPending : registerPending;

  return (
    <main className="min-h-screen w-full bg-white text-slate-900 antialiased font-sans flex flex-col lg:flex-row">
      {/* SISI KIRI: FORM LOGIN / REGISTER (Full screen di HP, 50% di Desktop) */}
      <div className="w-full lg:w-1/2 xl:w-[48%] min-h-screen flex flex-col justify-between px-6 py-8 sm:px-12 md:px-16 lg:px-16 xl:px-24 bg-white z-10">
        {/* LOGO PT */}
        <div className="flex items-center">
          <img
            src="/Logo OKG.png"
            alt="Logo PT OKG"
            className="h-10 sm:h-12 w-auto max-w-[220px] object-contain"
          />
        </div>

        {/* CONTAINER TENGAH: GREETING & FORM */}
        <div className="my-auto py-8 sm:py-10 max-w-md w-full mx-auto lg:mx-0">
          {/* TITLE & GREETING */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              {mode === "login" ? (
                <>
                  <span>Selamat Datang</span>
                </>
              ) : (
                <>
                  Daftar Akun
                </>
              )}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 font-medium">
              {mode === "login"
                ? "Silakan masuk ke akun Anda untuk melanjutkan"
                : "Silakan lengkapi data berikut"}
            </p>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 shadow-2xs"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* FORM LOGIN */}
          {mode === "login" && (
            <form action={loginFormAction} className="space-y-4">
              <div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#5D5FEF] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/15 transition-all shadow-2xs"
                  placeholder="nama@gmail.com"
                />
              </div>

              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-11 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#5D5FEF] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/15 transition-all shadow-2xs"
                  placeholder="•••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded-md border-slate-300 text-[#5D5FEF] focus:ring-[#5D5FEF]"
                  />
                  <span className="font-medium">Ingat Saya</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Lupa Kata Sandi?
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 sm:h-12 rounded-xl font-semibold text-xs sm:text-sm text-white bg-[#5D5FEF] hover:bg-[#4E50E0] active:scale-[0.99] transition-all shadow-md shadow-[#5D5FEF]/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPending ? "Memproses..." : "Masuk"}
                </button>
              </div>
            </form>
          )}

          {/* FORM REGISTER */}
          {mode === "register" && (
            <form action={registerFormAction} className="space-y-3.5">
              <div>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#5D5FEF] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/15 transition-all shadow-2xs"
                  placeholder="Nama Lengkap"
                />
              </div>

              <div>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#5D5FEF] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/15 transition-all shadow-2xs"
                  placeholder="Alamat Email Perusahaan"
                />
              </div>

              <div>
                <select
                  id="register-site"
                  name="siteId"
                  defaultValue="BATULICIN"
                  className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm text-slate-900 focus:border-[#5D5FEF] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/15 transition-all shadow-2xs"
                >
                  {SITES.map((s) => (
                    <option key={s.id} value={s.id}>
                      Site {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-11 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#5D5FEF] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/15 transition-all shadow-2xs"
                  placeholder="Password (minimal 6 karakter)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 sm:h-12 rounded-xl font-semibold text-xs sm:text-sm text-white bg-[#5D5FEF] hover:bg-[#4E50E0] active:scale-[0.99] transition-all shadow-md shadow-[#5D5FEF]/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPending ? "Mendaftarkan..." : "Daftar Akun"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* FOOTER SWITCH */}
        <div className="pt-6 pb-2 text-xs sm:text-sm text-slate-500 max-w-md w-full mx-auto lg:mx-0">
          {mode === "login" ? (
            <span>
              Belum memiliki akun?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="font-bold text-[#5D5FEF] hover:underline"
              >
                Daftar
              </button>
            </span>
          ) : (
            <span>
              Sudah memiliki akun?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-bold text-[#5D5FEF] hover:underline"
              >
                Masuk
              </button>
            </span>
          )}
        </div>
      </div>

      {/* SISI KANAN: FULL SCREEN HERO IMAGE (gudang.png) - HANYA DI DESKTOP / LAPTOP (hidden di HP) */}
      <div className="hidden lg:block lg:w-1/2 xl:w-[52%] min-h-screen relative bg-slate-900 overflow-hidden">
        <img
          src="/gudang.png"
          alt="Gudang SGM PT OKG"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

        {/* Caption & Brand Overlay at Bottom */}
        <div className="absolute bottom-10 left-10 right-10 text-white space-y-2.5">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight drop-shadow-sm">
            Support Goods &amp; Maintenance
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-mono tracking-wide">
            Batulicin • Tanjung • Kendari
          </p>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Info className="h-4 w-4 text-[#5D5FEF]" />
                <span>Reset Password</span>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Untuk mengatur ulang kata sandi atau reset akun, silakan hubungi <strong>Admin Site</strong> atau Administrator Pusat di Batulicin untuk dilakukan reset melalui menu Pengaturan Pengguna.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowForgotModal(false)}
                className="w-full h-9 rounded-xl font-semibold text-xs text-white bg-[#5D5FEF] hover:bg-[#4E50E0] transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
