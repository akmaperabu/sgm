/* Seed: akun default, periode, master barang + kartu stok, aset, dan data contoh.
   Jalankan: npm run db:seed */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, pad, startOfDay } from "../src/lib/format";

const prisma = new PrismaClient();
const SITES = ["BATULICIN", "TANJUNG", "KENDARI"];

const BASE_ITEMS = [
  { code: "ATK-001", name: "Kertas A4 80gr (rim)", category: "ATK", unit: "rim", min: 10 },
  { code: "ATK-002", name: "Pulpen Hitam", category: "ATK", unit: "pcs", min: 24 },
  { code: "ATK-003", name: "Tinta Printer Hitam", category: "ATK", unit: "botol", min: 4 },
  { code: "HSE-001", name: "Sarung Tangan Safety", category: "HSE", unit: "pasang", min: 20 },
  { code: "HSE-002", name: "Helm Safety", category: "HSE", unit: "pcs", min: 8 },
  { code: "HSE-003", name: "APAR 6 Kg", category: "HSE", unit: "unit", min: 3 },
  { code: "SPR-001", name: "Oli Mesin 15W-40 (liter)", category: "SPARETYPE", unit: "liter", min: 40 },
  { code: "SPR-002", name: "Filter Oli Truck", category: "SPARETYPE", unit: "pcs", min: 6 },
  { code: "SPR-003", name: "Regulator Oxygen", category: "SPARETYPE", unit: "unit", min: 2 },
  { code: "SPR-004", name: "Seal Kompresor Acetylene", category: "SPARETYPE", unit: "set", min: 3 },
].map((i) => ({ ...i, category: i.category === "SPARETYPE" ? "SPAREPART" : i.category }));

// stok saat ini per site (urut sesuai BASE_ITEMS)
const STOCK: Record<string, number[]> = {
  BATULICIN: [32, 60, 6, 45, 12, 5, 120, 3, 0, 4],
  TANJUNG: [14, 18, 2, 30, 6, 4, 55, 8, 3, 1],
  KENDARI: [22, 40, 5, 12, 10, 2, 0, 5, 2, 3],
};

async function main() {
  const now = new Date();
  const today = startOfDay(now);

  // ---- Users
  await prisma.user.upsert({
    where: { email: "dandy@gmail.com" },
    update: {},
    create: {
      name: "Dandy",
      email: "dandy@gmail.com",
      passwordHash: await bcrypt.hash("Dandy123", 10),
      role: "USER",
      siteId: "BATULICIN",
    },
  });
  const admin = await prisma.user.upsert({
    where: { email: "Jaya@gmail.com" },
    update: {},
    create: {
      name: "Jaya",
      email: "Jaya@gmail.com",
      passwordHash: await bcrypt.hash("Admin123", 10),
      role: "ADMIN",
      siteId: null,
    },
  });
  const dandy = await prisma.user.findUniqueOrThrow({ where: { email: "dandy@gmail.com" } });

  // ---- Periods: 2 bulan lalu (ditutup) + bulan berjalan (aktif)
  const periods = [];
  for (let back = 2; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const name = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    periods.push(
      await prisma.period.upsert({
        where: { periodName: name },
        update: {},
        create: {
          periodName: name,
          startDate: d,
          endDate: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
          isActive: back === 0,
          closedAt: back === 0 ? null : new Date(d.getFullYear(), d.getMonth() + 1, 1),
        },
      }),
    );
  }
  const [pAug, pSep, pOct] = periods;

  // ---- Items & stock cards
  const itemIds: Record<string, string[]> = {};
  for (const site of SITES) {
    itemIds[site] = [];
    for (let i = 0; i < BASE_ITEMS.length; i++) {
      const b = BASE_ITEMS[i];
      const cur = STOCK[site][i];
      const item = await prisma.inventoryItem.upsert({
        where: { siteId_code: { siteId: site, code: b.code } },
        update: {},
        create: { siteId: site, code: b.code, name: b.name, category: b.category, unit: b.unit, minStock: b.min, currentStock: cur },
      });
      itemIds[site].push(item.id);
      if (await prisma.inventoryStockCard.findFirst({ where: { itemId: item.id } })) continue;

      // Rantai saldo: Agu -> Sep -> Okt (opening periode N = closing periode N-1)
      const octIn = i % 3 === 0 ? Math.min(10, cur) : 0;
      const octOut = Math.min(cur + octIn, 2 + (i % 4));
      const octOpen = cur - octIn + octOut;
      const sepOut = 2 + (i % 5);
      const sepIn = Math.min(8 + i, octOpen + sepOut);
      const sepOpen = octOpen + sepOut - sepIn;
      const augOut = 4 + i;
      const augIn = Math.min(6 + i, sepOpen + augOut);
      const augOpen = sepOpen + augOut - augIn;
      const chain = [
        { p: pAug, open: augOpen, in: augIn, out: augOut },
        { p: pSep, open: sepOpen, in: sepIn, out: sepOut },
        { p: pOct, open: octOpen, in: octIn, out: octOut },
      ];
      for (const c of chain) {
        await prisma.inventoryStockCard.create({
          data: {
            itemId: item.id, periodId: c.p.id, siteId: site,
            openingStock: c.open, qtyIn: c.in, qtyOut: c.out, closingStock: c.open + c.in - c.out,
          },
        });
        const mid = addDays(c.p.startDate, 9);
        let bal = c.open;
        if (c.in) {
          bal += c.in;
          await prisma.stockMovement.create({ data: { siteId: site, itemId: item.id, periodId: c.p.id, type: "IN", qty: c.in, balance: bal, refType: "MANUAL", note: "Penerimaan (data awal)", createdBy: admin.id, createdAt: mid } });
        }
        if (c.out) {
          bal -= c.out;
          await prisma.stockMovement.create({ data: { siteId: site, itemId: item.id, periodId: c.p.id, type: "OUT", qty: c.out, balance: bal, refType: "GI", note: "Pemakaian (data awal)", createdBy: admin.id, createdAt: addDays(mid, 3) } });
        }
      }
    }
  }

  // ---- Assets (jadwal relatif terhadap hari ini agar reminder H-7 langsung terlihat)
  const assetDefs = [
    { code: "ACE-01", name: "Plant Acetylene #1", category: "ACETYLENE", interval: 1, offset: 4, last: -40 },
    { code: "OXY-01", name: "Plant Oxygen #1", category: "OXYGEN", interval: 2, offset: 25, last: -35 },
    { code: "TRK-01", name: "Truck DA 8123 AB", category: "UNIT_TRUCK", interval: 2, offset: 1, last: -4 },
    { code: "TRK-02", name: "Truck DA 8456 CD", category: "UNIT_TRUCK", interval: 1, offset: -1, last: -50 },
  ];
  const assets: Record<string, Record<string, string>> = {};
  for (const site of SITES) {
    assets[site] = {};
    for (const a of assetDefs) {
      const due = addDays(today, a.offset);
      const row = await prisma.asset.upsert({
        where: { siteId_code: { siteId: site, code: a.code } },
        update: {},
        create: {
          siteId: site, code: a.code, name: a.name, category: a.category,
          intervalMonths: a.interval, scheduleDay: due.getDate(), nextDueDate: due,
          lastServiceDate: addDays(today, a.last),
        },
      });
      assets[site][a.code] = row.id;
    }
  }

  // ---- Data contoh transaksi (hanya bila belum ada)
  if ((await prisma.purchaseRequest.count()) === 0) {
    const mk = (n: number, site: string, data: object) =>
      prisma.purchaseRequest.create({
        data: { prNumber: `PR-${pOct.periodName.replace("-", "").slice(2)}-${pad(n).padStart(4, "0")}`, siteId: site, periodId: pOct.id, requestedBy: dandy.id, qty: 5, ...data } as never,
      });
    await mk(1, "BATULICIN", { itemId: itemIds.BATULICIN[8], qty: 3, notes: "Stok regulator kosong", status: "Submitted" });
    await mk(2, "BATULICIN", { isNewItem: true, newItemName: "Kacamata Las Shade 11", newItemCategory: "HSE", qty: 6, notes: "Untuk tim welding", status: "Approved", approvedAt: now });
    await mk(3, "BATULICIN", { itemId: itemIds.BATULICIN[7], qty: 10, status: "On Process", poNumber: "PO-2610-0012", vendor: "CV Mitra Teknik", approvedAt: now });
    await mk(4, "BATULICIN", { itemId: itemIds.BATULICIN[6], qty: 100, status: "In Transit", poNumber: "PO-2610-0009", vendor: "PT Lubrindo", trackingNo: "SJ-88213", eta: addDays(today, 2), approvedAt: now });
    await mk(5, "KENDARI", { itemId: itemIds.KENDARI[6], qty: 60, status: "Submitted", notes: "Oli habis" });
  }
  if ((await prisma.goodsIssue.count()) === 0) {
    await prisma.goodsIssue.create({
      data: { number: `GI-${pOct.periodName.replace("-", "").slice(2)}-0001`, siteId: "BATULICIN", periodId: pOct.id, itemId: itemIds.BATULICIN[3], qty: 4, purpose: "Pemakaian harian operator plant", requestedBy: dandy.id },
    });
  }
  if ((await prisma.maintenanceTicket.count()) === 0) {
    await prisma.maintenanceTicket.create({
      data: { number: `MT-${pOct.periodName.replace("-", "").slice(2)}-0001`, siteId: "BATULICIN", assetId: assets.BATULICIN["TRK-02"], type: "CORRECTIVE", status: "Open", urgency: "High", description: "Rem blong, tekanan angin turun saat muat.", requestedBy: dandy.id },
    });
  }

  console.log("Seed selesai. Akun: dandy@gmail.com / Dandy123 (USER, BATULICIN) | Jaya@gmail.com / Admin123 (ADMIN)");
}

main().finally(() => prisma.$disconnect());
