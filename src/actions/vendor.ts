"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { opt, req, run, str } from "@/lib/action-utils";

export async function saveVendor(fd: FormData) {
  await requireUser();
  await run("/vendors", async () => {
    const id = opt(fd, "id");
    const name = req(fd, "name", "Nama vendor");
    const contactPerson = opt(fd, "contactPerson");
    const phone = opt(fd, "phone");
    const address = opt(fd, "address");

    if (id) {
      const existing = await prisma.vendor.findFirst({
        where: { name, NOT: { id } },
      });
      if (existing) {
        throw new Error(`Vendor dengan nama "${name}" sudah terdaftar.`);
      }
      await prisma.vendor.update({
        where: { id },
        data: { name, contactPerson, phone, address },
      });
      return;
    }

    const duplicate = await prisma.vendor.findUnique({
      where: { name },
    });
    if (duplicate) {
      throw new Error(`Vendor dengan nama "${name}" sudah terdaftar.`);
    }

    await prisma.vendor.create({
      data: { name, contactPerson, phone, address, isActive: true },
    });
  }, "Data vendor berhasil disimpan.");
}

export async function toggleVendor(fd: FormData) {
  await requireUser();
  await run("/vendors", async () => {
    const id = req(fd, "id", "ID Vendor");
    const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id } });
    await prisma.vendor.update({
      where: { id },
      data: { isActive: !vendor.isActive },
    });
  }, "Status vendor diperbarui.");
}

export async function deleteVendor(fd: FormData) {
  await requireUser();
  await run("/vendors", async () => {
    const id = req(fd, "id", "ID Vendor");
    const count = await prisma.purchaseRequest.count({ where: { vendorId: id } });
    if (count > 0) {
      throw new Error(
        `Vendor tidak dapat dihapus karena telah terhubung dengan ${count} transaksi PR/PO. Anda dapat menonaktifkan vendor ini agar tidak muncul dalam rekomendasi.`
      );
    }
    await prisma.vendor.delete({ where: { id } });
  }, "Vendor berhasil dihapus.");
}
