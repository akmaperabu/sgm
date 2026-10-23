"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { nextNumber, ensureActivePeriod } from "@/lib/period";
import { advanceDue } from "@/lib/maintenance";
import { firstOccurrence } from "@/lib/format";
import { int, opt, req, run, str } from "@/lib/action-utils";
import { ASSET_CATEGORIES, SITES, URGENCIES } from "@/lib/constants";
import { saveUploadedFile } from "@/lib/upload";

// Corrective Maintenance
export async function requestRepair(fd: FormData) {
  const user = await requireUser();
  await run("/maintenance/requests", async () => {
    const asset = await prisma.asset.findUniqueOrThrow({ where: { id: req(fd, "assetId", "Aset") } });
    const userSite = (user.siteId ?? "").toUpperCase();
    if (user.role === "USER" && userSite && asset.siteId.toUpperCase() !== userSite) {
      throw new Error("Aset di luar site Anda.");
    }
    const urgency = req(fd, "urgency", "Urgensi");
    if (!(URGENCIES as readonly string[]).includes(urgency)) throw new Error("Urgensi tidak valid.");
    const period = await ensureActivePeriod();
    const uploadedPhoto = await saveUploadedFile(fd.get("photo"));
    const photoUrl = uploadedPhoto ?? opt(fd, "photoUrl");
    await prisma.maintenanceTicket.create({
      data: {
        number: await nextNumber("MT", period.periodName),
        siteId: asset.siteId,
        assetId: asset.id,
        type: "CORRECTIVE",
        status: "Open",
        description: req(fd, "description", "Deskripsi kerusakan"),
        urgency,
        photoUrl,
        requestedBy: user.id,
      },
    });
  }, "Request perbaikan diajukan.");
}

export async function handleRepair(fd: FormData) {
  const admin = await requireAdmin();
  await run("/maintenance/requests", async () => {
    const t = await prisma.maintenanceTicket.findUniqueOrThrow({ where: { id: req(fd, "id") } });
    if (t.type !== "CORRECTIVE") throw new Error("Bukan tiket perbaikan.");
    const step = str(fd, "step");
    if (step === "progress") {
      if (t.status !== "Open") throw new Error("Tiket sudah diproses.");
      await prisma.maintenanceTicket.update({ where: { id: t.id }, data: { status: "In Progress", handledBy: admin.id } });
    } else if (step === "reject") {
      if (t.status !== "Open") throw new Error("Tiket sudah diproses.");
      await prisma.maintenanceTicket.update({ where: { id: t.id }, data: { status: "Rejected", resolution: opt(fd, "note") ?? "Ditolak", handledBy: admin.id } });
    } else if (step === "complete") {
      if (!["Open", "In Progress"].includes(t.status)) throw new Error("Tiket sudah selesai/ditolak.");
      const now = new Date();
      await prisma.$transaction([
        prisma.maintenanceTicket.update({ where: { id: t.id }, data: { status: "Completed", completedAt: now, resolution: opt(fd, "resolution"), handledBy: admin.id } }),
        // Hanya last_service_date; jadwal rutin (nextDueDate) TIDAK digeser.
        prisma.asset.update({ where: { id: t.assetId }, data: { lastServiceDate: now } }),
      ]);
    } else throw new Error("Aksi tidak dikenal.");
  }, "Tiket diperbarui.");
}

// Preventive Maintenance
export async function completeRoutine(fd: FormData) {
  const admin = await requireAdmin();
  await run("/maintenance/schedule", async () => {
    const t = await prisma.maintenanceTicket.findUniqueOrThrow({ where: { id: req(fd, "id") }, include: { asset: true } });
    if (t.type !== "PREVENTIVE" || t.status !== "Upcoming") throw new Error("Tiket rutin sudah diproses.");
    const now = new Date();
    await prisma.$transaction([
      prisma.maintenanceTicket.update({ where: { id: t.id }, data: { status: "Completed", completedAt: now, resolution: opt(fd, "resolution"), handledBy: admin.id } }),
      prisma.asset.update({
        where: { id: t.assetId },
        data: { lastServiceDate: now, nextDueDate: advanceDue(t.dueDate!, t.asset.intervalMonths, t.asset.scheduleDay) },
      }),
    ]);
  }, "Maintenance rutin diselesaikan.");
}

export async function skipRoutine(fd: FormData) {
  const admin = await requireAdmin();
  await run("/maintenance/schedule", async () => {
    const t = await prisma.maintenanceTicket.findUniqueOrThrow({ where: { id: req(fd, "id") }, include: { asset: true } });
    if (t.type !== "PREVENTIVE" || t.status !== "Upcoming") throw new Error("Tiket rutin sudah diproses.");
    const reason = str(fd, "reason");
    if (reason.length < 5) throw new Error("Alasan/keterangan skip wajib diisi (minimal 5 karakter).");
    await prisma.$transaction([
      prisma.maintenanceTicket.update({ where: { id: t.id }, data: { status: "Skipped", skipReason: reason, completedAt: new Date(), handledBy: admin.id } }),
      // Jadwal berikutnya tetap berjalan sesuai tanggal tetap.
      prisma.asset.update({ where: { id: t.assetId }, data: { nextDueDate: advanceDue(t.dueDate!, t.asset.intervalMonths, t.asset.scheduleDay) } }),
    ]);
  }, "Jadwal rutin di-skip.");
}

export async function updateSchedule(fd: FormData) {
  await requireAdmin();
  await run("/maintenance/schedule", async () => {
    const asset = await prisma.asset.findUniqueOrThrow({ where: { id: req(fd, "id") } });
    const intervalMonths = int(fd, "intervalMonths", "Interval bulan");
    const scheduleDay = int(fd, "scheduleDay", "Tanggal");
    if (intervalMonths < 1 || intervalMonths > 24) throw new Error("Interval 1-24 bulan.");
    if (scheduleDay < 1 || scheduleDay > 31) throw new Error("Tanggal 1-31.");
    const open = await prisma.maintenanceTicket.findFirst({ where: { assetId: asset.id, type: "PREVENTIVE", status: "Upcoming" } });
    await prisma.asset.update({
      where: { id: asset.id },
      data: { intervalMonths, scheduleDay, ...(open ? {} : { nextDueDate: firstOccurrence(new Date(), scheduleDay) }) },
    });
  }, "Pengaturan jadwal disimpan.");
}

// Master Aset
export async function saveAsset(fd: FormData) {
  await requireAdmin();
  await run("/maintenance/assets", async () => {
    const id = opt(fd, "id");
    const name = req(fd, "name", "Nama aset");
    const category = req(fd, "category", "Kategori");
    if (!ASSET_CATEGORIES.some((c) => c.id === category)) throw new Error("Kategori tidak valid.");

    const purchaseDateStr = opt(fd, "purchaseDate");
    const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;
    const lifespanMonths = opt(fd, "lifespanMonths") ? int(fd, "lifespanMonths", "Target masa pakai") : null;

    if (id) {
      const intervalMonths = opt(fd, "intervalMonths") ? int(fd, "intervalMonths", "Interval bulan") : undefined;
      const scheduleDay = opt(fd, "scheduleDay") ? int(fd, "scheduleDay", "Tanggal") : undefined;
      if (intervalMonths !== undefined && (intervalMonths < 1 || intervalMonths > 24)) throw new Error("Interval 1-24 bulan.");
      if (scheduleDay !== undefined && (scheduleDay < 1 || scheduleDay > 31)) throw new Error("Tanggal 1-31.");
      await prisma.asset.update({
        where: { id },
        data: {
          name,
          category,
          purchaseDate,
          lifespanMonths,
          ...(intervalMonths !== undefined ? { intervalMonths } : {}),
          ...(scheduleDay !== undefined ? { scheduleDay } : {}),
        },
      });
      return;
    }
    const siteId = req(fd, "siteId", "Site");
    if (!SITES.some((s) => s.id === siteId)) throw new Error("Site tidak valid.");
    const code = req(fd, "code", "Kode aset").toUpperCase();
    if (await prisma.asset.findUnique({ where: { siteId_code: { siteId, code } } })) throw new Error(`Kode ${code} sudah dipakai di site tersebut.`);
    const intervalMonths = int(fd, "intervalMonths", "Interval bulan");
    const scheduleDay = int(fd, "scheduleDay", "Tanggal");
    if (intervalMonths < 1 || scheduleDay < 1 || scheduleDay > 31) throw new Error("Interval/tanggal tidak valid.");
    await prisma.asset.create({
      data: {
        siteId,
        code,
        name,
        category,
        intervalMonths,
        scheduleDay,
        purchaseDate,
        lifespanMonths,
        nextDueDate: firstOccurrence(new Date(), scheduleDay),
      },
    });
  });
}

export async function recordCalibrationOrExtension(fd: FormData) {
  await requireAdmin();
  await run("/maintenance/assets", async () => {
    const id = req(fd, "id");
    const asset = await prisma.asset.findUniqueOrThrow({ where: { id } });
    const calDateStr = opt(fd, "calibrationDate");
    const calDate = calDateStr ? new Date(calDateStr) : new Date();
    const addMonths = opt(fd, "addMonths") ? int(fd, "addMonths", "Tambahan masa pakai") : 0;
    const notes = opt(fd, "notes");

    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        lastCalibrationDate: calDate,
        extendedMonths: (asset.extendedMonths ?? 0) + (addMonths > 0 ? addMonths : 0),
        calibrationNotes: notes,
      },
    });
  }, "Data kalibrasi / rekondisi berhasil disimpan.");
}

export async function toggleAsset(fd: FormData) {
  await requireAdmin();
  await run("/maintenance/assets", async () => {
    const a = await prisma.asset.findUniqueOrThrow({ where: { id: req(fd, "id") } });
    await prisma.asset.update({ where: { id: a.id }, data: { isActive: !a.isActive } });
  }, "Status aset diperbarui.");
}

// Pengaturan User
export async function createUser(fd: FormData) {
  await requireAdmin();
  await run("/settings", async () => {
    const email = req(fd, "email", "Email").toLowerCase();
    const role = req(fd, "role", "Role");
    if (!["USER", "ADMIN"].includes(role)) throw new Error("Role tidak valid.");
    const siteId = role === "USER" ? req(fd, "siteId", "Site") : null;
    if (siteId && !SITES.some((s) => s.id === siteId)) throw new Error("Site tidak valid.");
    const password = req(fd, "password", "Password");
    if (password.length < 6) throw new Error("Password minimal 6 karakter.");
    const exists = (await prisma.user.findMany({ select: { email: true } })).some((u) => u.email.toLowerCase() === email);
    if (exists) throw new Error("Email sudah terdaftar.");
    await prisma.user.create({
      data: { name: req(fd, "name", "Nama"), email, passwordHash: await bcrypt.hash(password, 10), role, siteId },
    });
  }, "Akun dibuat.");
}

export async function toggleUser(fd: FormData) {
  const admin = await requireAdmin();
  await run("/settings", async () => {
    const id = req(fd, "id");
    if (id === admin.id) throw new Error("Tidak dapat menonaktifkan akun sendiri.");
    const u = await prisma.user.findUniqueOrThrow({ where: { id } });
    await prisma.user.update({ where: { id }, data: { isActive: !u.isActive } });
  }, "Status akun diperbarui.");
}

export async function updateUser(fd: FormData) {
  await requireAdmin();
  await run("/settings", async () => {
    const id = req(fd, "id");
    const name = req(fd, "name", "Nama");
    const role = req(fd, "role", "Role");
    if (!["USER", "ADMIN"].includes(role)) throw new Error("Role tidak valid.");
    const siteId = role === "USER" ? opt(fd, "siteId") || null : null;
    if (siteId && !SITES.some((s) => s.id === siteId)) throw new Error("Site tidak valid.");
    await prisma.user.update({
      where: { id },
      data: { name, role, siteId },
    });
  }, "Data pengguna berhasil diperbarui.");
}

export async function resetPassword(fd: FormData) {
  await requireAdmin();
  await run("/settings", async () => {
    const id = req(fd, "id");
    const password = req(fd, "password", "Password");
    if (password.length < 6) throw new Error("Password minimal 6 karakter.");
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }, "Password berhasil direset.");
}

