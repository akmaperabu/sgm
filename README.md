# SGM - Support Goods & Maintenance (Industrial Gas Plant)

Next.js (App Router, TS) + Tailwind + Lucide + Prisma (SQLite). Acuan: `PRD.md`.

## Menjalankan
```bash
npm install
npm run db:push     # buat skema database
npm run db:seed     # akun default + data contoh
npm run dev         # http://localhost:3000
```
Reset data: `npm run db:reset`.

## Akun default
| Role  | Email             | Password | Site                |
|-------|-------------------|----------|---------------------|
| USER  | dandy@gmail.com   | Dandy123 | BATULICIN           |
| ADMIN | Jaya@gmail.com    | Admin123 | Lintas site         |

## Catatan arsitektur
- Skema: `prisma/schema.prisma`. Untuk PostgreSQL ganti `provider` + `DATABASE_URL`.
- Periode bulanan: `src/lib/period.ts` (`ensureActivePeriod`) melakukan cut-off otomatis
  saat bulan berganti dan membawa saldo akhir menjadi stok awal.
- Semua mutasi stok lewat `src/lib/stock.ts` (`moveStock`).
- Reminder H-7 rutin: `src/lib/maintenance.ts`; Skip wajib alasan: `src/actions/maintenance.ts`.
- Admin memilih periode arsip via dropdown (`?period=YYYY-MM`, read-only); User hanya periode aktif.
