import "server-only";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

type MoveInput = {
  itemId: string;
  type: "IN" | "OUT" | "ADJUST";
  /** IN/OUT: positif. ADJUST: selisih bertanda (+/-). */
  qty: number;
  refType?: string;
  refNo?: string;
  note?: string;
  userId?: string;
};

/**
 * Satu-satunya pintu mutasi stok: memperbarui stok barang, kartu stok periode aktif
 * (stok awal / masuk / keluar / akhir) dan log riwayat.
 */
export async function moveStock(tx: Tx, input: MoveInput) {
  const period = await tx.period.findFirstOrThrow({ where: { isActive: true } });
  const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: input.itemId } });
  const delta = input.type === "IN" ? input.qty : input.type === "OUT" ? -input.qty : input.qty;
  if (input.type !== "ADJUST" && input.qty <= 0) throw new Error("Jumlah harus lebih dari 0.");
  if (item.currentStock + delta < 0)
    throw new Error(`Stok ${item.name} tidak cukup (tersedia ${item.currentStock} ${item.unit}).`);

  let card = await tx.inventoryStockCard.findUnique({
    where: { itemId_periodId: { itemId: item.id, periodId: period.id } },
  });
  if (!card) {
    card = await tx.inventoryStockCard.create({
      data: {
        itemId: item.id,
        periodId: period.id,
        siteId: item.siteId,
        openingStock: item.currentStock,
        closingStock: item.currentStock,
      },
    });
  }
  await tx.inventoryStockCard.update({
    where: { id: card.id },
    data: {
      closingStock: { increment: delta },
      ...(input.type === "IN" && { qtyIn: { increment: input.qty } }),
      ...(input.type === "OUT" && { qtyOut: { increment: input.qty } }),
      ...(input.type === "ADJUST" && { qtyAdjust: { increment: input.qty } }),
    },
  });
  await tx.inventoryItem.update({ where: { id: item.id }, data: { currentStock: { increment: delta } } });
  await tx.stockMovement.create({
    data: {
      siteId: item.siteId,
      itemId: item.id,
      periodId: period.id,
      type: input.type,
      qty: input.qty,
      balance: item.currentStock + delta,
      refType: input.refType,
      refNo: input.refNo,
      note: input.note,
      createdBy: input.userId,
    },
  });
  return period;
}

/** Pastikan barang baru langsung punya kartu stok di periode aktif. */
export async function createCardForNewItem(tx: Tx, itemId: string, siteId: string, opening = 0) {
  const period = await tx.period.findFirstOrThrow({ where: { isActive: true } });
  await tx.inventoryStockCard.upsert({
    where: { itemId_periodId: { itemId, periodId: period.id } },
    update: {},
    create: { itemId, periodId: period.id, siteId, openingStock: opening, closingStock: opening },
  });
}
