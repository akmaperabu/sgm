import "server-only";
import { cookies } from "next/headers";
import { requireUser } from "./auth";
import { ensureActivePeriod, getPeriods } from "./period";
import { SITES } from "./constants";

export type SearchParams = Promise<Record<string, string | undefined>>;

/**
 * Konteks request: user, site yang difilter (USER terkunci ke site-nya, ADMIN via Site Switcher)
 * dan periode (USER hanya periode aktif, ADMIN bisa membuka arsip via ?period=YYYY-MM).
 */
export async function getCtx(sp: Record<string, string | undefined> = {}) {
  const [user, active, periods] = await Promise.all([
    requireUser(),
    ensureActivePeriod(),
    getPeriods(),
  ]);

  const isAdmin = user.role === "ADMIN";
  let period = active;
  if (isAdmin && sp.period) period = periods.find((p) => p.periodName === sp.period) ?? active;

  const cookieSite = (await cookies()).get("sgm_site")?.value;
  const site = isAdmin
    ? SITES.some((s) => s.id === cookieSite)
      ? (cookieSite as string)
      : "ALL"
    : (user.siteId as string);

  return {
    user,
    isAdmin,
    site, // "ALL" | site id
    siteWhere: site === "ALL" ? {} : { siteId: site },
    period,
    periods,
    activePeriod: active,
    /** periode arsip = hanya baca */
    readOnly: !period.isActive,
    /** site tujuan untuk operasi tulis oleh Admin bila Site Switcher = Semua */
    writeSite: site === "ALL" ? "BATULICIN" : site,
  };
}

export type Ctx = Awaited<ReturnType<typeof getCtx>>;
