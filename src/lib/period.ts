import "server-only";
import { prisma } from "./db";
import { pad } from "./format";

/**
 * Sistem periode bulanan. Dipanggil di setiap request:
 * bila bulan berjalan belum menjadi periode aktif, periode lama otomatis di-cut-off
 * (ditutup) dan periode baru dibuka. Saldo akhir = stok awal periode baru.
 */
export async function ensureActivePeriod(now = new Date()) {
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

export async function nextNumber(prefix: "GI" | "PR" | "MT", periodName: string) {
  const tag = periodName.replace("-", "").slice(2);
  const model =
    prefix === "GI" ? prisma.goodsIssue : prefix === "PR" ? prisma.purchaseRequest : prisma.maintenanceTicket;
  const count = await (model as unknown as { count: () => Promise<number> }).count();
  let i = count + 1;
  while (true) {
    const num = `${prefix}-${tag}-${String(i).padStart(4, "0")}`;
    let exists = false;
    if (prefix === "GI") exists = !!(await prisma.goodsIssue.findUnique({ where: { number: num } }));
    else if (prefix === "PR") exists = !!(await prisma.purchaseRequest.findUnique({ where: { prNumber: num } }));
    else if (prefix === "MT") exists = !!(await prisma.maintenanceTicket.findUnique({ where: { number: num } }));
    if (!exists) return num;
    i++;
  }
}

