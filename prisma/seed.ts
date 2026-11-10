/* Seed: akun default dan periode aktif.
   Jalankan: npm run db:seed */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { pad } from "../src/lib/format";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  // ---- Admin Utama
  await prisma.user.upsert({
    where: { email: "jayaharisantoso14@gmail.com" },
    update: { role: "ADMIN", isActive: true },
    create: {
      name: "Jaya Hari Santoso",
      email: "jayaharisantoso14@gmail.com",
      passwordHash: await bcrypt.hash("Admin123", 10),
      role: "ADMIN",
      siteId: null,
    },
  });

  // ---- Periode Berjalan (Aktif)
  const periodName = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  await prisma.period.upsert({
    where: { periodName },
    update: { isActive: true },
    create: {
      periodName,
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      isActive: true,
    },
  });

  console.log("Seed bersih selesai. Hanya akun User, Admin, dan Periode aktif yang dibuat.");
  console.log("Akun Admin: jaya@gmail.com / Admin123");
  console.log("Akun User: dandy@gmail.com / Dandy123 (Site Batulicin)");
}

main().finally(() => prisma.$disconnect());
