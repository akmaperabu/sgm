import { getCtx, type SearchParams } from "@/lib/context";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Panel } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { RowActionMenu } from "@/components/row-action-menu";
import {
  Badge,
  Empty,
  Field,
  btnPrimary,
  inputCls,
  selectCls,
  table,
  tableWrap,
  td,
  th,
} from "@/components/ui";
import { SITES, siteLabel } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { createUser, toggleUser, updateUser, resetPassword } from "@/actions/maintenance";
import { KeyRound, Pencil, Power } from "lucide-react";

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const ctx = await getCtx(sp);

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        ctx={ctx}
        showPeriod={false}
        title="Pengaturan Pengguna"
        actions={
          <FormDialog label="Tambah Pengguna" title="Registrasi Akun Baru">
            <form action={createUser} className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Nama Lengkap">
                <input name="name" required className={inputCls} placeholder="Contoh: Budi Pratama" />
              </Field>
              <Field label="Email">
                <input name="email" type="email" required className={inputCls} placeholder="budi@sgm.local" />
              </Field>
              <Field label="Password (min. 6)">
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </Field>
              <Field label="Role Akses">
                <select name="role" defaultValue="USER" className={selectCls}>
                  <option value="USER">USER (Terkunci 1 Site)</option>
                  <option value="ADMIN">ADMIN (Akses Lintas Site)</option>
                </select>
              </Field>
              <Field label="Site Penempatan (untuk USER)">
                <select name="siteId" className={selectCls}>
                  {SITES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2 pt-2">
                <button className={`${btnPrimary} w-full`}>Buat Akun Baru</button>
              </div>
            </form>
          </FormDialog>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="text-xs font-medium text-slate-500 mb-1">Total Pengguna</div>
            <div className="text-xl font-bold font-mono text-slate-900">{users.length}</div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="text-xs font-medium text-slate-500 mb-1">Administrator</div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {users.filter((u) => u.role === "ADMIN").length}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="text-xs font-medium text-slate-500 mb-1">Staff Site (User)</div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {users.filter((u) => u.role === "USER").length}
            </div>
          </div>
        </div>

        <Panel title={`Daftar Akun Pengguna (${users.length})`}>
          <div className={tableWrap + " !border-0"}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>Pengguna</th>
                  <th className={th}>Email</th>
                  <th className={th}>Role</th>
                  <th className={th}>Site Penempatan</th>
                  <th className={th}>Status</th>
                  <th className={th}>Tgl Dibuat</th>
                  <th className={th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrent = u.id === ctx.user.id;
                  return (
                    <tr key={u.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className={`${td} font-medium text-slate-900`}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200/60">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900">{u.name}</span>
                            {isCurrent && (
                              <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200/60">
                                Akun Anda
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`${td} font-mono text-xs text-slate-600`}>{u.email}</td>
                      <td className={td}>
                        <Badge tone="slate">
                          {u.role === "ADMIN" ? "Admin" : "User"}
                        </Badge>
                      </td>
                      <td className={td}>
                        <span className="font-medium text-slate-800">
                          {u.role === "ADMIN"
                            ? "Lintas Site (Pusat)"
                            : u.siteId
                              ? siteLabel(u.siteId)
                              : "Semua Site"}
                        </span>
                      </td>
                      <td className={td}>
                        {u.isActive ? (
                          <Badge tone="green" dot>Aktif</Badge>
                        ) : (
                          <Badge tone="slate" dot>Nonaktif</Badge>
                        )}
                      </td>
                      <td className={`${td} font-mono text-xs text-slate-500`}>
                        {fmtDate(u.createdAt)}
                      </td>
                      <td className={td}>
                        <RowActionMenu>
                          <FormDialog
                            title={`Edit Akun - ${u.name}`}
                            trigger={
                              <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                                <Pencil className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                <span>Edit Akun</span>
                              </div>
                            }
                          >
                            <form action={updateUser} className="grid gap-3.5">
                              <input type="hidden" name="id" value={u.id} />
                              <Field label="Nama Lengkap">
                                <input
                                  name="name"
                                  defaultValue={u.name}
                                  required
                                  className={inputCls}
                                />
                              </Field>

                              <Field label="Email (Tercatat)">
                                <input
                                  defaultValue={u.email}
                                  disabled
                                  className={`${inputCls} bg-slate-100/70 text-slate-500 cursor-not-allowed`}
                                />
                              </Field>

                              <Field label="Ubah Role">
                                <select
                                  name="role"
                                  defaultValue={u.role}
                                  className={selectCls}
                                >
                                  <option value="USER">USER (Terkunci pada 1 site)</option>
                                  <option value="ADMIN">ADMIN (Akses lintas semua site)</option>
                                </select>
                              </Field>

                              <Field label="Pindah Lokasi Site (Khusus USER)">
                                <select
                                  name="siteId"
                                  defaultValue={u.siteId ?? "BATULICIN"}
                                  className={selectCls}
                                >
                                  {SITES.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                                <p className="mt-1 text-[11px] text-slate-400">
                                  Bila role dijadikan ADMIN, site penempatan otomatis berlaku lintas site.
                                </p>
                              </Field>

                              <div className="pt-2">
                                <button className={`${btnPrimary} w-full`}>
                                  Simpan Perubahan
                                </button>
                              </div>
                            </form>
                          </FormDialog>

                          <FormDialog
                            title={`Reset Password - ${u.name}`}
                            trigger={
                              <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors">
                                <KeyRound className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                <span>Reset Password</span>
                              </div>
                            }
                          >
                            <form action={resetPassword} className="grid gap-3.5">
                              <input type="hidden" name="id" value={u.id} />
                              <p className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 leading-relaxed font-medium">
                                Masukkan password baru untuk akun <strong>{u.name}</strong> ({u.email}).
                              </p>
                              <Field label="Password Baru (min. 6 karakter)">
                                <input
                                  name="password"
                                  type="password"
                                  required
                                  minLength={6}
                                  placeholder="Minimal 6 karakter"
                                  className={inputCls}
                                />
                              </Field>
                              <div className="pt-2">
                                <button className={`${btnPrimary} w-full`}>
                                  Simpan Password Baru
                                </button>
                              </div>
                            </form>
                          </FormDialog>

                          {!isCurrent && (
                            <form action={toggleUser} className="w-full">
                              <input type="hidden" name="id" value={u.id} />
                              <button
                                type="submit"
                                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${u.isActive
                                    ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                    : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                  }`}
                              >
                                <Power className="h-3.5 w-3.5 shrink-0" />
                                <span>{u.isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}</span>
                              </button>
                            </form>
                          )}
                        </RowActionMenu>
                      </td>
                    </tr>
                  );
                })}
                {!users.length && <Empty cols={7} text="Belum ada data pengguna." />}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
