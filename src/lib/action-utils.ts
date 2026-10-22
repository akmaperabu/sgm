import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ensureActivePeriod } from "./period";

/**
 * Jalankan aksi server; error validasi/bisnis ditampilkan lewat ?err=..., sukses lewat ?ok=...
 * (Auth check HARUS dilakukan sebelum memanggil run karena redirect() melempar exception.)
 */
export async function run(path: string, fn: () => Promise<void>, okMsg = "Berhasil disimpan.") {
  let err: string | undefined;
  try {
    await ensureActivePeriod();
    await fn();
  } catch (e) {
    err = e instanceof Error ? e.message : "Terjadi kesalahan.";
  }
  revalidatePath(path);
  redirect(`${path}?${err ? "err=" + encodeURIComponent(err) : "ok=" + encodeURIComponent(okMsg)}`);
}

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const opt = (fd: FormData, k: string) => str(fd, k) || undefined;
export function int(fd: FormData, k: string, label = k) {
  const n = Number(str(fd, k));
  if (!Number.isInteger(n)) throw new Error(`${label} harus berupa bilangan bulat.`);
  return n;
}
export function req(fd: FormData, k: string, label = k) {
  const v = str(fd, k);
  if (!v) throw new Error(`${label} wajib diisi.`);
  return v;
}
