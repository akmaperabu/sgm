import { getCtx } from "@/lib/context";
import { AppShell } from "@/components/app-shell";
import { syncPreventiveTickets } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx();
  await syncPreventiveTickets(); // reminder H-7 otomatis
  return (
    <AppShell user={{ name: ctx.user.name, role: ctx.user.role, siteId: ctx.user.siteId }} site={ctx.site}>
      {children}
    </AppShell>
  );
}
