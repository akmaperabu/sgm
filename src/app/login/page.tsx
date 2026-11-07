"use client";

import { useState, useActionState } from "react";
import { loginAction, registerAction } from "@/actions/auth";
import { SITES } from "@/lib/constants";
import { Eye, EyeOff, AlertCircle, Info, X } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, undefined);
  const [registerState, registerFormAction, registerPending] = useActionState(registerAction, undefined);

  const error = mode === "login" ? loginState?.error : registerState?.error;
  const isPending = mode === "login" ? loginPending : registerPending;

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 antialiased font-sans select-none overflow-x-hidden">
      {/* BACKGROUND GUDANG DENGAN BLUR 40% & OVERLAY */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <img
          src="/gudang.png"
          alt="Gudang SGM PT OKG"
          className="w-full h-full object-cover object-center scale-105"
          style={{ filter: "blur(8px)" }}
        />
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />
      </div>

      {/* CONTAINER FORM LOGIN DITENGAH */}
      <div className="relative z-10 w-full max-w-[420px] sm:max-w-[440px] my-auto">
        {/* CARD LOGIN / REGISTER */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/30 border border-white/60 p-6 sm:p-8 md:p-9 text-slate-900 transition-all">
          {/* LOGO OKG DI TENGAH ATAS FORM LOGIN */}
          <div className="flex justify-center mb-5 sm:mb-6">
            <img
              src="/Logo OKG.png"
              alt="Logo PT OKG"
              className="h-12 sm:h-14 w-auto max-w-[220px] object-contain drop-shadow-xs"
            />
          </div>

          {/* TITLE & GREETING */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {mode === "login" ? "Selamat Datang" : "Daftar Akun"}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 font-medium">
              {mode === "login"
                ? "Silakan masuk ke akun Anda untuk melanjutkan"
                : "Silakan lengkapi data pendaftaran berikut"}
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
                <label htmlFor="login-email" className="sr-only">
                  Email
                </label>
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
                <label htmlFor="login-password" className="sr-only">
                  Password
                </label>
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

              <div className="flex items-center justify-end text-xs pt-0.5">
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
                  className="w-full h-11 sm:h-12 rounded-xl font-semibold text-xs sm:text-sm text-white bg-[#5D5FEF] hover:bg-[#4E50E0] active:scale-[0.99] transition-all shadow-md shadow-[#5D5FEF]/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
                <label htmlFor="register-name" className="sr-only">
                  Nama Lengkap
                </label>
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
                <label htmlFor="register-email" className="sr-only">
                  Alamat Email Perusahaan
                </label>
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
                <label htmlFor="register-site" className="sr-only">
                  Site
                </label>
                <select
                  id="register-site"
                  name="siteId"
                  defaultValue="BATULICIN"
                  className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm text-slate-900 focus:border-[#5D5FEF] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/15 transition-all shadow-2xs cursor-pointer"
                >
                  {SITES.map((s) => (
                    <option key={s.id} value={s.id}>
                      Site {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label htmlFor="register-password" className="sr-only">
                  Password
                </label>
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
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 sm:h-12 rounded-xl font-semibold text-xs sm:text-sm text-white bg-[#5D5FEF] hover:bg-[#4E50E0] active:scale-[0.99] transition-all shadow-md shadow-[#5D5FEF]/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPending ? "Mendaftarkan..." : "Daftar Akun"}
                </button>
              </div>
            </form>
          )}

          {/* FOOTER SWITCH (LOGIN / REGISTER) */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-500">
            {mode === "login" ? (
              <span>
                Belum memiliki akun?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="font-bold text-[#5D5FEF] hover:underline cursor-pointer"
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
                  className="font-bold text-[#5D5FEF] hover:underline cursor-pointer"
                >
                  Masuk
                </button>
              </span>
            )}
          </div>
        </div>

        {/* BRANDING FOOTER DI BAWAH CARD */}
        <div className="mt-5 text-center text-white/80 drop-shadow-sm font-medium space-y-1">
          <p className="text-xs font-semibold tracking-wide">
            Support Goods &amp; Maintenance • PT OKG
          </p>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Info className="h-4 w-4 text-[#5D5FEF]" />
                <span>Reset Password</span>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
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
                className="w-full h-9 rounded-xl font-semibold text-xs text-white bg-[#5D5FEF] hover:bg-[#4E50E0] transition-colors cursor-pointer"
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
