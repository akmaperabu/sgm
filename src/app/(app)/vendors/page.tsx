import { getCtx, type SearchParams } from "@/lib/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { ViewDetailDialog, DetailSection, DetailItem } from "@/components/view-detail-dialog";
import { RowActionMenu } from "@/components/row-action-menu";
import {
  Badge,
  Empty,
  Field,
  btnPrimary,
  btnSecondary,
  inputCls,
  selectCls,
  stickyTd,
  stickyTh,
  table,
  tableWrap,
  td,
  th,
} from "@/components/ui";
import { fmtDate, num } from "@/lib/format";
import { saveVendor, toggleVendor, deleteVendor } from "@/actions/vendor";
import {
  Building2,
  Phone,
  User,
  MapPin,
  Search,
  Eye,
  Pencil,
  Power,
  Trash2,
  FileText,
  CheckCircle2,
  Layers,
} from "lucide-react";

export default async function VendorsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const ctx = await getCtx(sp);
  const q = (sp.q ?? "").trim();
  const statusFilter = sp.status ?? "";

  const whereClause: any = {};
  if (q) {
    whereClause.OR = [
      { name: { contains: q } },
      { contactPerson: { contains: q } },
      { phone: { contains: q } },
      { address: { contains: q } },
    ];
  }
  if (statusFilter === "active") {
    whereClause.isActive = true;
  } else if (statusFilter === "inactive") {
    whereClause.isActive = false;
  }

  const vendors = await prisma.vendor.findMany({
    where: whereClause,
    include: {
      _count: {
        select: { purchaseRequests: true },
      },
      purchaseRequests: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          prNumber: true,
          poNumber: true,
          status: true,
          createdAt: true,
          newItemName: true,
          item: { select: { name: true } },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const totalVendors = await prisma.vendor.count();
  const activeVendors = await prisma.vendor.count({ where: { isActive: true } });
  const linkedPRCount = await prisma.purchaseRequest.count({
    where: { vendorId: { not: null } },
  });

  return (
    <>
      <PageHeader
        ctx={ctx}
        sp={sp}
        title="Master Vendor & Rekanan"
        actions={
          <FormDialog label="Tambah Vendor" title="Tambah Rekanan Vendor Baru">
            <VendorForm />
          </FormDialog>
        }
      />

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Rekanan</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{num(totalVendors)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Database supplier & mitra</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Vendor Aktif</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{num(activeVendors)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Siap digunakan pada PR/PO</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Terhubung Transaksi</p>
            <p className="text-xl font-extrabold text-indigo-700 mt-0.5">{num(linkedPRCount)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Pesanan pengadaan PR/PO</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-xs">
        <form className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5" method="get">
          {sp.period && <input type="hidden" name="period" value={sp.period} />}
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari nama vendor, PIC, telepon, kota..."
              aria-label="Cari vendor"
              className={`${inputCls} pl-9`}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              name="status"
              defaultValue={statusFilter}
              aria-label="Status Vendor"
              className={`${selectCls} flex-1 sm:!w-44`}
            >
              <option value="">Semua Status</option>
              <option value="active">Hanya Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
            <button className={`${btnSecondary} shrink-0`}>Filter Data</button>
          </div>
        </form>
      </div>

      {/* Table Area */}
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} ${stickyTh}`}>Nama Rekanan / Vendor</th>
              <th className={th}>Kontak Person (PIC)</th>
              <th className={th}>No. Telepon / WA</th>
              <th className={th}>Alamat Lengkap</th>
              <th className={`${th} text-center`}>Histori PR/PO</th>
              <th className={th}>Status</th>
              <th className={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => {
              const detailContent = (
                <div className="space-y-4">
                  <DetailSection title="Informasi Legalitas & Profil Vendor">
                    <DetailItem label="Nama Perusahaan / Toko" value={v.name} highlight span2 />
                    <DetailItem
                      label="Status Kemitraan"
                      value={
                        v.isActive ? (
                          <Badge tone="green">Aktif &amp; Terverifikasi</Badge>
                        ) : (
                          <Badge tone="slate">Nonaktif</Badge>
                        )
                      }
                    />
                    <DetailItem label="Terdaftar Sejak" value={fmtDate(v.createdAt)} />
                    <DetailItem
                      label="Total Transaksi PR / PO"
                      value={
                        <span className="font-mono font-semibold text-slate-900">
                          {num(v._count.purchaseRequests)} Pengadaan
                        </span>
                      }
                    />
                  </DetailSection>

                  <DetailSection title="Kontak & Lokasi">
                    <DetailItem
                      label="Kontak Person (PIC)"
                      value={
                        v.contactPerson ? (
                          <span className="flex items-center gap-1.5 font-medium text-slate-800">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {v.contactPerson}
                          </span>
                        ) : (
                          "-"
                        )
                      }
                    />
                    <DetailItem
                      label="No. Telepon / WhatsApp"
                      value={
                        v.phone ? (
                          <span className="flex items-center gap-1.5 font-mono text-slate-800">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {v.phone}
                          </span>
                        ) : (
                          "-"
                        )
                      }
                    />
                    <DetailItem
                      label="Alamat Lengkap"
                      value={
                        v.address ? (
                          <span className="flex items-start gap-1.5 text-slate-700">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <span>{v.address}</span>
                          </span>
                        ) : (
                          "-"
                        )
                      }
                      span2
                    />
                  </DetailSection>

                  {v.purchaseRequests.length > 0 && (
                    <DetailSection title="Pengadaan Terakhir Menggunakan Vendor Ini">
                      <div className="space-y-2 col-span-2">
                        {v.purchaseRequests.map((pr) => (
                          <div
                            key={pr.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-slate-800">
                                {pr.item?.name ?? pr.newItemName ?? "Barang Pengadaan"}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                {pr.prNumber} {pr.poNumber ? `• PO: ${pr.poNumber}` : ""} • {fmtDate(pr.createdAt)}
                              </div>
                            </div>
                            <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                              {pr.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </DetailSection>
                  )}
                </div>
              );

              return (
                <tr key={v.id} className="group hover:bg-slate-50/70 transition-colors">
                  <td className={`${td} ${stickyTd}`}>
                    <ViewDetailDialog
                      title={`Detail Rekanan: ${v.name}`}
                      subtitle={`Terdaftar ${fmtDate(v.createdAt)}`}
                      trigger={
                        <div className="text-left group/item cursor-pointer">
                          <div className="font-semibold text-slate-900 group-hover/item:text-blue-700 transition-colors underline-offset-2 hover:underline flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                v.isActive ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-slate-300"
                              }`}
                            />
                            <span>{v.name}</span>
                          </div>
                        </div>
                      }
                    >
                      {detailContent}
                    </ViewDetailDialog>
                  </td>
                  <td className={td}>
                    {v.contactPerson ? (
                      <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400 shrink-0" />
                        {v.contactPerson}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className={`${td} font-mono text-xs text-slate-600`}>
                    {v.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        {v.phone}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className={`${td} text-xs text-slate-600 max-w-[240px] truncate`} title={v.address || ""}>
                    {v.address || <span className="text-slate-400">-</span>}
                  </td>
                  <td className={`${td} text-center`}>
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100/80">
                      <FileText className="h-3 w-3" />
                      {num(v._count.purchaseRequests)}
                    </span>
                  </td>
                  <td className={td}>
                    {v.isActive ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Nonaktif</Badge>}
                  </td>
                  <td className={td}>
                    <RowActionMenu>
                      <ViewDetailDialog
                        title={`Detail Rekanan: ${v.name}`}
                        subtitle={`Terdaftar ${fmtDate(v.createdAt)}`}
                        trigger={
                          <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                            <Eye className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>Lihat Detail</span>
                          </div>
                        }
                      >
                        {detailContent}
                      </ViewDetailDialog>

                      <FormDialog
                        title={`Edit Vendor: ${v.name}`}
                        trigger={
                          <div className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                            <Pencil className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>Edit Vendor</span>
                          </div>
                        }
                      >
                        <VendorForm vendor={v} />
                      </FormDialog>

                      <form action={toggleVendor} className="w-full">
                        <input type="hidden" name="id" value={v.id} />
                        <button
                          type="submit"
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                            v.isActive
                              ? "text-amber-700 hover:bg-amber-50"
                              : "text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          <Power className="h-3.5 w-3.5 shrink-0" />
                          <span>{v.isActive ? "Nonaktifkan Vendor" : "Aktifkan Vendor"}</span>
                        </button>
                      </form>

                      <form action={deleteVendor} className="w-full">
                        <input type="hidden" name="id" value={v.id} />
                        <button
                          type="submit"
                          disabled={v._count.purchaseRequests > 0}
                          title={
                            v._count.purchaseRequests > 0
                              ? "Vendor tidak dapat dihapus karena memiliki riwayat PR/PO"
                              : "Hapus vendor secara permanen"
                          }
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                            v._count.purchaseRequests > 0
                              ? "opacity-40 cursor-not-allowed text-slate-400"
                              : "text-rose-600 hover:bg-rose-50"
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Hapus Vendor</span>
                        </button>
                      </form>
                    </RowActionMenu>
                  </td>
                </tr>
              );
            })}
            {!vendors.length && <Empty cols={7} text="Belum ada data rekanan vendor." />}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Data vendor digunakan sebagai referensi rekanan terpercaya saat pemrosesan PO pengadaan (PR/PO).
      </p>
    </>
  );
}

function VendorForm({
  vendor,
}: {
  vendor?: {
    id: string;
    name: string;
    contactPerson: string | null;
    phone: string | null;
    address: string | null;
  };
}) {
  return (
    <form action={saveVendor} className="grid gap-3 sm:grid-cols-2">
      {vendor && <input type="hidden" name="id" value={vendor.id} />}
      <div className="sm:col-span-2">
        <Field label="Nama Vendor / Toko Rekanan">
          <input
            name="name"
            required
            defaultValue={vendor?.name ?? ""}
            placeholder="Contoh: PT. Aneka Gas & Teknik Industri"
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Kontak Person (PIC)">
        <input
          name="contactPerson"
          defaultValue={vendor?.contactPerson ?? ""}
          placeholder="Contoh: Bpk. Bambang Sutrisno"
          className={inputCls}
        />
      </Field>
      <Field label="No. Telepon / WhatsApp">
        <input
          name="phone"
          defaultValue={vendor?.phone ?? ""}
          placeholder="Contoh: 0812-3456-7890"
          className={`${inputCls} font-mono`}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Alamat Kantor / Toko Fisik">
          <textarea
            name="address"
            rows={3}
            defaultValue={vendor?.address ?? ""}
            placeholder="Contoh: Jl. Ahmad Yani Km. 4.5, Batulicin, Tanah Bumbu, Kalimantan Selatan"
            className={inputCls}
          />
        </Field>
      </div>
      <div className="sm:col-span-2 pt-2 flex justify-end gap-2 border-t border-slate-100">
        <button type="submit" className={`${btnPrimary} !w-full sm:!w-auto`}>
          {vendor ? "Simpan Perubahan" : "Daftarkan Vendor"}
        </button>
      </div>
    </form>
  );
}
