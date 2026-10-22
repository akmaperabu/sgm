import { Field, inputCls } from "./ui";
import { ItemSearchSelect } from "./item-search-select";

export function SparepartFields({ items }: { items: { id: string; code: string; name: string; currentStock: number }[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="col-span-2">
        <Field label="Sparepart dipakai (opsional, potong stok)">
          <ItemSearchSelect
            name="itemId"
            required={false}
            placeholder="Cari sparepart (kosongkan jika tidak ada)..."
            items={items.map((i) => ({
              id: i.id,
              label: `${i.code} - ${i.name}`,
              badge: `Stok: ${i.currentStock}`,
            }))}
          />
        </Field>
      </div>
      <Field label="Qty">
        <input name="qty" type="number" min={1} defaultValue={1} className={`${inputCls} font-mono`} />
      </Field>
    </div>
  );
}
