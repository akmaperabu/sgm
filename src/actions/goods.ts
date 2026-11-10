"use server";

import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { ensureActivePeriod, nextNumber } from "@/lib/period";
import { createCardForNewItem, moveStock } from "@/lib/stock";
import { int, opt, req, run, str } from "@/lib/action-utils";
import { ITEM_CATEGORIES, SITES } from "@/lib/constants";
import { saveUploadedFile } from "@/lib/upload";

const validSite = (s: string) => {
  if (!SITES.some((x) => x.id === s)) throw new Error("Site tidak valid.");
  return s;
};
const validCat = (c: string) => {
  if (!ITEM_CATEGORIES.some((x) => x.id === c)) throw new Error("Kategori tidak valid.");
  return c;
};
const PREFIX: Record<string, string> = { ATK: "ATK", HSE: "HSE", SPAREPART: "SPR" };

async function autoCode(siteId: string, category: string) {
  const head = `${PREFIX[category]}-`;
  const last = await prisma.inventoryItem.findFirst({
    where: { siteId, code: { startsWith: head } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const lastSeq = last ? Number.parseInt(last.code.slice(head.length), 10) : 0;
  let i = Number.isNaN(lastSeq) ? 1 : lastSeq + 1;
  for (; ;) {
    const code = `${head}${String(i).padStart(3, "0")}`;
    if (!(await prisma.inventoryItem.findUnique({ where: { siteId_code: { siteId, code } } }))) return code;
    i++;
  }
}

// Master Barang
export async function saveItem(fd: FormData) {
  const admin = await requireAdmin();
  await run("/items", async () => {
    const id = opt(fd, "id");
    const name = req(fd, "name", "Nama barang");
    const category = validCat(req(fd, "category", "Kategori"));
    const unit = req(fd, "unit", "Satuan");
    const minStock = int(fd, "minStock", "Stok minimum");
    if (minStock < 0) throw new Error("Stok minimum tidak boleh negatif.");
    if (id) {
      await prisma.inventoryItem.update({ where: { id }, data: { name, category, unit, minStock } });
      return;
    }
    const siteId = validSite(req(fd, "siteId", "Site"));
    const code = opt(fd, "code")?.toUpperCase() ?? (await autoCode(siteId, category));
    if (await prisma.inventoryItem.findUnique({ where: { siteId_code: { siteId, code } } }))
      throw new Error(`Kode ${code} sudah dipakai di site tersebut.`);
    const initial = Math.max(0, Number(str(fd, "initial")) || 0);
    await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({ data: { siteId, code, name, category, unit, minStock } });
      await createCardForNewItem(tx, item.id, siteId, 0);
      if (initial > 0)
        await moveStock(tx, { itemId: item.id, type: "IN", qty: initial, refType: "MANUAL", note: "Stok awal", userId: admin.id });
    });
  });
}

export async function toggleItem(fd: FormData) {
  await requireAdmin();
  await run("/items", async () => {
    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: req(fd, "id") } });
    await prisma.inventoryItem.update({ where: { id: item.id }, data: { isActive: !item.isActive } });
  }, "Status barang diperbarui.");
}

// Penerimaan Manual
export async function receiveManual(fd: FormData) {
  const admin = await requireAdmin();
  await run("/goods-receipt", async () => {
    const itemId = req(fd, "itemId", "Barang");
    const qty = int(fd, "qty", "Jumlah");
    if (qty <= 0) throw new Error("Jumlah harus lebih dari 0.");

    const uploadedPhoto = await saveUploadedFile(fd.get("photo"));
    const photoUrl = uploadedPhoto ?? opt(fd, "photoUrl");

    await prisma.$transaction((tx) =>
      moveStock(tx, {
        itemId,
        type: "IN",
        qty,
        refType: "MANUAL",
        refNo: opt(fd, "refNo"),
        note: opt(fd, "note") ?? "Penerimaan manual",
        photoUrl,
        userId: admin.id,
      }),
    );
  }, "Penerimaan barang dicatat.");
}

// Goods Issue
export async function requestIssue(fd: FormData) {
  const user = await requireUser();
  await run("/goods-issue", async () => {
    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: req(fd, "itemId", "Barang") } });
    const userSite = (user.siteId ?? "").toUpperCase();
    if (user.role === "USER" && userSite && item.siteId.toUpperCase() !== userSite) {
      throw new Error("Barang di luar site Anda.");
    }
    const qty = int(fd, "qty", "Jumlah");
    if (qty <= 0) throw new Error("Jumlah harus lebih dari 0.");
    if (qty > item.currentStock) throw new Error(`Stok tidak cukup (tersedia ${item.currentStock} ${item.unit}).`);
    const period = await ensureActivePeriod();
    await prisma.goodsIssue.create({
      data: {
        number: await nextNumber("GI", period.periodName),
        siteId: item.siteId,
        periodId: period.id,
        itemId: item.id,
        qty,
        purpose: req(fd, "purpose", "Keperluan"),
        ticketId: opt(fd, "ticketId"),
        requestedBy: user.id,
      },
    });
  }, "Request pengambilan barang diajukan (Pending Approval).");
}

export async function decideIssue(fd: FormData) {
  const admin = await requireAdmin();
  await run("/goods-issue", async () => {
    const gi = await prisma.goodsIssue.findUniqueOrThrow({ where: { id: req(fd, "id") }, include: { item: true } });
    if (gi.status !== "Pending Approval") throw new Error("Pengajuan sudah diproses.");
    const approve = str(fd, "decision") === "approve";
    await prisma.$transaction(async (tx) => {
      if (approve)
        await moveStock(tx, { itemId: gi.itemId, type: "OUT", qty: gi.qty, refType: "GI", refNo: gi.number, note: gi.purpose, userId: admin.id });
      await tx.goodsIssue.update({
        where: { id: gi.id },
        data: {
          status: approve ? "Approved" : "Rejected",
          decidedBy: admin.id,
          decidedAt: new Date(),
          rejectNote: approve ? null : opt(fd, "note") ?? "Ditolak",
        },
      });
    });
  }, "Keputusan tersimpan.");
}

// Stock Adjustment
export async function adjustStock(fd: FormData) {
  const admin = await requireAdmin();
  await run("/stock-adjustment", async () => {
    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: req(fd, "itemId", "Barang") } });
    const physical = int(fd, "physical", "Stok fisik");
    if (physical < 0) throw new Error("Stok fisik tidak boleh negatif.");
    const reason = req(fd, "reason", "Alasan penyesuaian");
    const delta = physical - item.currentStock;
    if (delta === 0) throw new Error("Stok fisik sama dengan stok sistem, tidak ada penyesuaian.");
    await prisma.$transaction((tx) =>
      moveStock(tx, { itemId: item.id, type: "ADJUST", qty: delta, refType: "ADJUSTMENT", note: reason, userId: admin.id }),
    );
  }, "Stock adjustment tersimpan.");
}

// Purchase Request / PO
export async function requestPurchase(fd: FormData) {
  const user = await requireUser();
  await run("/purchasing", async () => {
    const qty = int(fd, "qty", "Jumlah");
    if (qty <= 0) throw new Error("Jumlah harus lebih dari 0.");
    const isNew = str(fd, "itemId") === "__NEW__";
    const userSite = (user.siteId ?? opt(fd, "siteId") ?? "BATULICIN").toUpperCase();
    const siteId = user.role === "USER" ? userSite : validSite(req(fd, "siteId", "Site"));
    const period = await ensureActivePeriod();
    const uploadedPhoto = await saveUploadedFile(fd.get("photo"));
    const photoUrl = uploadedPhoto ?? opt(fd, "photoUrl");

    const base = {
      prNumber: await nextNumber("PR", period.periodName),
      siteId,
      periodId: period.id,
      qty,
      notes: opt(fd, "notes"),
      photoUrl,
      requestedBy: user.id,
    };
    if (isNew) {
      await prisma.purchaseRequest.create({
        data: {
          ...base,
          isNewItem: true,
          newItemName: req(fd, "newItemName", "Nama barang baru"),
          newItemCategory: validCat(req(fd, "newItemCategory", "Kategori")),
        },
      });
    } else {
      const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: req(fd, "itemId", "Barang") } });
      if (item.siteId.toUpperCase() !== siteId.toUpperCase()) throw new Error("Barang bukan milik site tersebut.");
      await prisma.purchaseRequest.create({ data: { ...base, itemId: item.id } });
    }
  }, "Purchase Request diajukan (Submitted).");
}

export async function advancePurchase(fd: FormData) {
  const admin = await requireAdmin();
  const to = str(fd, "_to") === "/goods-receipt" ? "/goods-receipt" : "/purchasing";
  await run(to, async () => {
    const pr = await prisma.purchaseRequest.findUniqueOrThrow({ where: { id: req(fd, "id") } });
    const step = str(fd, "step");

    if (step === "reject") {
      if (!["Submitted", "Approved"].includes(pr.status)) throw new Error("PR tidak dapat ditolak pada tahap ini.");
      await prisma.purchaseRequest.update({ where: { id: pr.id }, data: { status: "Rejected", rejectNote: opt(fd, "note") ?? "Ditolak" } });
      return;
    }

    if (step === "approve") {
      if (pr.status !== "Submitted") throw new Error("PR sudah diproses.");
      const data: Record<string, unknown> = {
        status: "Approved",
        approvedAt: new Date(),
      };
      if (pr.isNewItem) {
        if (opt(fd, "newItemName")) data.newItemName = opt(fd, "newItemName");
        if (opt(fd, "newItemCategory")) data.newItemCategory = validCat(opt(fd, "newItemCategory")!);
        if (opt(fd, "newItemCode")) data.newItemCode = opt(fd, "newItemCode")?.toUpperCase();
      }
      await prisma.purchaseRequest.update({
        where: { id: pr.id },
        data,
      });
      return;
    }

    if (step === "process") {
      if (pr.status !== "Approved") throw new Error("PR harus berstatus Approved.");

      await prisma.purchaseRequest.update({
        where: { id: pr.id },
        data: {
          status: "On Process",
          poNumber: req(fd, "poNumber", "Nomor PO"),
        },
      });
      return;
    }

    if (step === "complete") {
      if (!["On Process", "In Transit", "Partially Received"].includes(pr.status)) {
        throw new Error("PR harus berstatus On Process atau Diterima Sebagian.");
      }
      const remaining = Math.max(0, pr.qty - pr.receivedQty);
      const batchQty = opt(fd, "receivedQty") ? int(fd, "receivedQty", "Jumlah diterima") : remaining;
      if (batchQty <= 0) throw new Error("Jumlah diterima harus lebih dari 0.");
      if (batchQty > remaining) throw new Error(`Jumlah diterima (${batchQty}) melebihi sisa pesanan (${remaining}).`);

      const newTotalReceived = pr.receivedQty + batchQty;
      const isComplete = newTotalReceived >= pr.qty;

      await prisma.$transaction(async (tx) => {
        let itemId = pr.itemId;

        // Jika barang baru dan belum terdaftar di Master Data: daftarkan sekarang saat fisik pertama tiba
        if (pr.isNewItem && !itemId) {
          const name = opt(fd, "name") ?? opt(fd, "newItemName") ?? pr.newItemName!;
          const category = validCat(opt(fd, "category") ?? opt(fd, "newItemCategory") ?? pr.newItemCategory!);
          const code = opt(fd, "code")?.toUpperCase() ?? opt(fd, "newItemCode")?.toUpperCase() ?? (await autoCode(pr.siteId, category));
          const unit = opt(fd, "unit") || "pcs";
          const minStock = opt(fd, "minStock") ? Math.max(0, int(fd, "minStock", "Stok minimum")) : 0;

          if (await tx.inventoryItem.findUnique({ where: { siteId_code: { siteId: pr.siteId, code } } })) {
            throw new Error(`Kode ${code} sudah dipakai di site tersebut.`);
          }

          const item = await tx.inventoryItem.create({
            data: { siteId: pr.siteId, code, name, category, unit, minStock, currentStock: 0 },
          });
          await createCardForNewItem(tx, item.id, pr.siteId, 0);
          itemId = item.id;
        }

        if (!itemId) throw new Error("Barang belum terdaftar di master.");

        await moveStock(tx, {
          itemId,
          type: "IN",
          qty: batchQty,
          refType: "PR",
          refNo: pr.poNumber ?? pr.prNumber,
          note: `Penerimaan ${pr.prNumber} (${newTotalReceived}/${pr.qty})`,
          userId: admin.id,
        });

        await tx.purchaseRequest.update({
          where: { id: pr.id },
          data: {
            status: isComplete ? "Complete" : "Partially Received",
            receivedQty: newTotalReceived,
            itemId,
            receivedAt: new Date(),
          },
        });
      });
      return;
    }
    throw new Error("Aksi tidak dikenal.");
  }, "Status PR diperbarui.");
}
