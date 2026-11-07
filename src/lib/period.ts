import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { pad } from "./format";

async function resolveActivePeriod(now = new Date()) {
  const name = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const current = await prisma.period.findUnique({ where: { periodName: name } });
  if (current?.isActive) return current;
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.period.updateMany({
        where: { isActive: true },
        data: { isActive: false, closedAt: now },
      });
      const period = current
        ? await tx.period.update({ where: { id: current.id }, data: { isActive: true, closedAt: null } })
        : await tx.period.create({
          data: {
            periodName: name,
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
            isActive: true,
          },
        });
      const items = await tx.inventoryItem.findMany({ where: { isActive: true } });
      const existing = await tx.inventoryStockCard.findMany({
        where: { periodId: period.id },
        select: { itemId: true },
      });
      const have = new Set(existing.map((c) => c.itemId));
      const data = items
        .filter((i) => !have.has(i.id))
        .map((i) => ({
          itemId: i.id,
          periodId: period.id,
          siteId: i.siteId,
          openingStock: i.currentStock,
          closingStock: i.currentStock,
        }));
      if (data.length) await tx.inventoryStockCard.createMany({ data });
      return period;
    });
  } catch {
    // request paralel sudah membuat periode yang sama
    return prisma.period.findUniqueOrThrow({ where: { periodName: name } });
  }
}

const getCachedActivePeriod = cache(() => resolveActivePeriod(new Date()));

/**
 * Sistem periode bulanan. Di-cache per request untuk tanggal berjalan:
 * bila bulan berjalan belum menjadi periode aktif, periode lama otomatis di-cut-off
 * (ditutup) dan periode baru dibuka. Saldo akhir = stok awal periode baru.
 */
export async function ensureActivePeriod(now?: Date) {
  if (!now) return getCachedActivePeriod();
  return resolveActivePeriod(now);
}

export const getPeriods = cache(async () => {
  await ensureActivePeriod();
  return prisma.period.findMany({ orderBy: { startDate: "desc" } });
});

export async function nextNumber(prefix: "GI" | "PR" | "MT", periodName: string) {
  const tag = periodName.replace("-", "").slice(2);
  const head = `${prefix}-${tag}-`;

  let lastStr: string | undefined;
  if (prefix === "GI") {
    const last = await prisma.goodsIssue.findFirst({
      where: { number: { startsWith: head } },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    lastStr = last?.number;
  } else if (prefix === "PR") {
    const last = await prisma.purchaseRequest.findFirst({
      where: { prNumber: { startsWith: head } },
      orderBy: { prNumber: "desc" },
      select: { prNumber: true },
    });
    lastStr = last?.prNumber;
  } else {
    const last = await prisma.maintenanceTicket.findFirst({
      where: { number: { startsWith: head } },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    lastStr = last?.number;
  }

  const lastSeq = lastStr ? Number.parseInt(lastStr.slice(head.length), 10) : 0;
  const nextSeq = Number.isNaN(lastSeq) ? 1 : lastSeq + 1;
  return `${head}${String(nextSeq).padStart(4, "0")}`;
}


