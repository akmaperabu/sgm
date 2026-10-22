export const SITES = [
  { id: "BATULICIN", label: "Batulicin" },
  { id: "TANJUNG", label: "Tanjung" },
  { id: "KENDARI", label: "Kendari" },
] as const;
export type SiteId = (typeof SITES)[number]["id"];
export const siteLabel = (id?: string | null) =>
  SITES.find((s) => s.id === id)?.label ?? "Semua Site";

export const ITEM_CATEGORIES = [
  { id: "ATK", label: "ATK" },
  { id: "HSE", label: "HSE" },
  { id: "SPAREPART", label: "Sparepart" },
] as const;
export const categoryLabel = (id?: string | null) =>
  ITEM_CATEGORIES.find((c) => c.id === id)?.label ?? id ?? "-";

export const ASSET_CATEGORIES = [
  { id: "ACETYLENE", label: "Acetylene" },
  { id: "OXYGEN", label: "Oxygen" },
  { id: "UNIT_TRUCK", label: "Unit Truck" },
] as const;
export const assetCategoryLabel = (id?: string | null) =>
  ASSET_CATEGORIES.find((c) => c.id === id)?.label ?? id ?? "-";

export const PR_FLOW = ["Submitted", "Approved", "On Process", "In Transit", "Complete"] as const;
export const URGENCIES = ["Low", "Medium", "High", "Critical"] as const;

/** Jumlah hari sebelum jatuh tempo ketika tiket rutin muncul (H-7). */
export const REMINDER_DAYS = 7;
