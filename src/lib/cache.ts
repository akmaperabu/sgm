import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "./db";

/**
 * Lapisan Caching (ISR / Next.js Data Cache) untuk data yang sering diakses.
 * Mengurangi beban ke database Supabase dan menyajikan data secara instan (<5ms).
 */

/**
 * Cache daftar periode bulanan (berlaku 1 jam atau sampai revalidateTag("periods") dipanggil).
 */
export const getCachedPeriods = unstable_cache(
  async () => {
    return prisma.period.findMany({ orderBy: { startDate: "desc" } });
  },
  ["periods_list"],
  { tags: ["periods"], revalidate: 3600 }
);

/**
 * Cache daftar master barang aktif per site untuk keperluan dropdown & form selection.
 */
export const getCachedActiveItems = unstable_cache(
  async (siteId?: string) => {
    const where = siteId && siteId !== "ALL" ? { siteId, isActive: true } : { isActive: true };
    return prisma.inventoryItem.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        siteId: true,
        currentStock: true,
        minStock: true,
        unit: true,
      },
      orderBy: [{ siteId: "asc" }, { name: "asc" }],
    });
  },
  ["active_items_list"],
  { tags: ["inventory_items"], revalidate: 600 }
);

/**
 * Cache daftar aset aktif per site untuk keperluan form & dropdown maintenance.
 */
export const getCachedActiveAssets = unstable_cache(
  async (siteId?: string) => {
    const where = siteId && siteId !== "ALL" ? { siteId, isActive: true } : { isActive: true };
    return prisma.asset.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        siteId: true,
        intervalMonths: true,
        scheduleDay: true,
        nextDueDate: true,
        lastServiceDate: true,
      },
      orderBy: [{ siteId: "asc" }, { name: "asc" }],
    });
  },
  ["active_assets_list"],
  { tags: ["assets"], revalidate: 600 }
);

/**
 * Invalidate cache saat terjadi mutasi data di Server Actions.
 */
export function invalidatePeriodsCache() {
  revalidateTag("periods", "max");
}

export function invalidateItemsCache() {
  revalidateTag("inventory_items", "max");
}

export function invalidateAssetsCache() {
  revalidateTag("assets", "max");
}
