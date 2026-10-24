"use client";

import { useState } from "react";
import { requestPurchase } from "@/actions/goods";
import { btnPrimary, Field, inputCls, selectCls } from "./ui";
import { ITEM_CATEGORIES, SITES } from "@/lib/constants";
import { ItemSearchSelect } from "./item-search-select";
import { ImageUploadInput } from "./image-upload-input";

type Opt = { id: string; label: string; siteId: string };

export function PurchaseRequestForm({ items, isAdmin, defaultSite }: { items: Opt[]; isAdmin: boolean; defaultSite: string }) {
  const [site, setSite] = useState(defaultSite);
  const [sel, setSel] = useState("");
  const [qty, setQty] = useState<number | "">(1);
  const [price, setPrice] = useState<number | "">("");
  const list = isAdmin ? items.filter((i) => i.siteId === site) : items;
  const isNew = sel === "__NEW__";

  const numQty = typeof qty === "number" && qty > 0 ? qty : 0;
  const numPrice = typeof price === "number" && price > 0 ? price : 0;
  const total = numQty * numPrice;

  return (
    <form action={requestPurchase} className="grid gap-3.5">
      {isAdmin ? (
        <Field label="Site">
          <select name="siteId" value={site} onChange={(e) => { setSite(e.target.value); setSel(""); }} className={selectCls}>
            {SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="siteId" value={site || defaultSite} />
      )}

      <Field label="Pilih Barang">
        <ItemSearchSelect
          name="itemId"
          required
          value={sel}
          onChange={(val) => setSel(val)}
          placeholder="Ketik untuk mencari barang gudang..."
          allowNew
          newLabel="+ Barang Baru (Belum Terdaftar di Sistem)"
          items={list.map((i) => ({
            id: i.id,
            label: i.label,
          }))}
        />
      </Field>

      {isNew && (
        <div className="grid gap-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nama Barang Baru">
              <input name="newItemName" required className={inputCls} placeholder="cth: Regulator Oxygen High Pressure" />
            </Field>
          </div>
          <Field label="Kategori">
            <select name="newItemCategory" className={selectCls}>
              {ITEM_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <ImageUploadInput name="photo" label="Foto Contoh Barang (Opsional)" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Jumlah Kebutuhan">
          <input
            name="qty"
            type="number"
            min={1}
            required
            value={qty}
            onChange={(e) => setQty(e.target.value ? Number(e.target.value) : "")}
            className={`${inputCls} font-mono`}
            placeholder="Jumlah barang"
          />
        </Field>

        <Field label="Estimasi Harga Satuan (Rp, opsional)">
          <input
            name="estimatedPrice"
            type="number"
            min={0}
            step="1000"
            value={price}
            onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")}
            className={`${inputCls} font-mono`}
            placeholder="cth: 250000"
          />
        </Field>
      </div>

      {total > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 flex items-center justify-between text-xs">
          <span className="text-emerald-800 font-medium">Total Estimasi Anggaran:</span>
          <span className="font-mono font-bold text-emerald-900 text-sm">
            Rp {Math.round(total).toLocaleString("id-ID")}
          </span>
        </div>
      )}

      <Field label="Spesifikasi / Catatan">
        <textarea name="notes" rows={3} placeholder="Keterangan spesifikasi teknis / alasan pembelian..." className={`${inputCls} !h-auto py-2.5`} />
      </Field>

      <div className="pt-2">
        <button className={btnPrimary}>Ajukan Purchase Request</button>
      </div>
    </form>
  );
}
