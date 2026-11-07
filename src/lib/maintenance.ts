import "server-only";
import { prisma } from "./db";
import { addDays, nextOccurrence, startOfDay } from "./format";
import { REMINDER_DAYS } from "./constants";
import { ensureActivePeriod, nextNumber } from "./period";

/**
 * Reminder H-7: tiket rutin (PREVENTIVE) otomatis dibuat 7 hari sebelum jatuh tempo.
 * Idempotent berkat unique (assetId, type, dueDate) dan hanya mengambil aset yang sudah masuk H-7.
 */
export async function syncPreventiveTickets(now = new Date()) {
  const period = await ensureActivePeriod(now);
  const today = startOfDay(now);
  const threshold = addDays(today, REMINDER_DAYS);

  const dueAssets = await prisma.asset.findMany({
    where: {
      isActive: true,
      nextDueDate: { lte: threshold },
    },
    include: {
      tickets: {
        where: { type: "PREVENTIVE" },
        select: { dueDate: true },
      },
    },
  });

  for (const a of dueAssets) {
    const dueTime = a.nextDueDate.getTime();
    const exists = a.tickets.some((t) => t.dueDate?.getTime() === dueTime);
    if (exists) continue;
    try {
      await prisma.maintenanceTicket.create({
        data: {
          number: await nextNumber("MT", period.periodName),
          siteId: a.siteId,
          assetId: a.id,
          type: "PREVENTIVE",
          status: "Upcoming",
          dueDate: a.nextDueDate,
          description: `Maintenance rutin tiap ${a.intervalMonths} bulan (tanggal ${a.scheduleDay}).`,
        },
      });
    } catch {
      /* dibuat oleh request paralel */
    }
  }
}

/** Geser jadwal rutin ke periode berikutnya sesuai interval & tanggal tetap. */
export function advanceDue(due: Date, intervalMonths: number, day: number) {
  return nextOccurrence(due, intervalMonths, day);
}
