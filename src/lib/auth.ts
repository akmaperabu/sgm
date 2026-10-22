import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const COOKIE = "sgm_session";
const secret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-sgm-ganti-di-produksi-32chars");

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  siteId: string | null;
};

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const u = await prisma.user.findUnique({ where: { id: String(payload.uid) } });
    if (!u || !u.isActive) return null;
    return { id: u.id, name: u.name, email: u.email, role: u.role as "USER" | "ADMIN", siteId: u.siteId };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") redirect("/?err=" + encodeURIComponent("Akses khusus Admin."));
  return u;
}
