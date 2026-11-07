"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { SITES } from "@/lib/constants";

export async function loginAction(_prev: { error?: string } | undefined, fd: FormData) {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Email dan password wajib diisi." };

  let u = await prisma.user.findUnique({ where: { email } });
  if (!u) {
    // Fallback case-insensitive untuk SQLite bila ada email huruf besar di DB
    const all = await prisma.user.findMany();
    u = all.find((x) => x.email.toLowerCase() === email) ?? null;
  }

  if (!u || !u.isActive || !(await bcrypt.compare(password, u.passwordHash)))
    return { error: "Email atau password salah." };
  await createSession(u.id);
  redirect("/");
}

export async function registerAction(_prev: { error?: string } | undefined, fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const siteId = String(fd.get("siteId") ?? "BATULICIN");

  if (!name) return { error: "Nama lengkap wajib diisi." };
  if (!email || !email.includes("@")) return { error: "Format email tidak valid." };
  if (password.length < 6) return { error: "Password minimal 6 karakter." };
  if (!SITES.some((s) => s.id === siteId)) return { error: "Pilih site penempatan yang valid." };

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { error: "Email sudah terdaftar. Silakan gunakan email lain atau login." };

  const passwordHash = await bcrypt.hash(password, 10);
  const u = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "USER",
      siteId,
      isActive: true,
    },
  });

  await createSession(u.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function setSiteAction(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") return;
  const v = String(fd.get("site") ?? "ALL");
  (await cookies()).set("sgm_site", SITES.some((s) => s.id === v) ? v : "ALL", { path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
}
