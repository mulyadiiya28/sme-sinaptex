"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import type { Product } from "@/lib/api/types";
import { FormField } from "@/components/form-field";
import { useProductMutations } from "@/hooks/queries";

const SCHEMA = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  sku: z.string().trim().min(1, "SKU wajib diisi"),
  barcode: z.string().trim().default(""),
  kategori: z.string().trim().min(1, "Kategori wajib diisi"),
  satuan: z.string().trim().min(1, "Satuan wajib diisi"),
  hargaBeli: z.number().int("Harga beli harus bilangan bulat").nonnegative("Harga beli tidak boleh negatif"),
  hargaJual: z.number().int("Harga jual harus bilangan bulat").positive("Harga jual harus > 0"),
  stok: z.number().int().nonnegative("Stok tidak boleh negatif"),
  stokMinimum: z.number().int().nonnegative("Stok minimum tidak boleh negatif"),
  status: z.enum(["aktif", "nonaktif"]),
});

type FormValues = z.infer<typeof SCHEMA>;

const KOSONG: FormValues = {
  nama: "",
  sku: "",
  barcode: "",
  kategori: "",
  satuan: "pcs",
  hargaBeli: 0,
  hargaJual: 0,
  stok: 0,
  stokMinimum: 0,
  status: "aktif",
};

export function ProductFormDialog({
  editing,
  onClose,
}: {
  editing: Product | null;
  onClose: () => void;
}) {
  const { create, update } = useProductMutations();
  const [values, setSet] = useState<FormValues>(() =>
    editing
      ? {
          nama: editing.nama,
          sku: editing.sku,
          barcode: editing.barcode,
          kategori: editing.kategori,
          satuan: editing.satuan,
          hargaBeli: editing.hargaBeli,
          hargaJual: editing.hargaJual,
          stok: editing.stok,
          stokMinimum: editing.stokMinimum,
          status: editing.status,
        }
      : KOSONG,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const mutationPending = create.isPending || update.isPending;

  useEffect(() => () => { create.reset(); update.reset(); }, [create, update]);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setSet((v) => ({ ...v, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const parsed = SCHEMA.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    const action = editing
      ? () => update.mutateAsync({ id: editing.id, data: parsed.data })
      : () => create.mutateAsync(parsed.data);
    action()
      .then(() => onClose())
      .catch((err: Error) => setServerError(err.message));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-xl overflow-y-auto p-7">
        <h2 className="font-black text-brand">{editing ? "Edit Produk" : "Tambah Produk"}</h2>
        <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nama produk" error={errors.nama} className="sm:col-span-2">
            <input
              className="input"
              value={values.nama}
              onChange={(e) => set("nama", e.target.value)}
              placeholder="cth. Beras 5 kg"
              autoFocus
            />
          </FormField>
          <FormField label="SKU" error={errors.sku}>
            <input className="input" value={values.sku} onChange={(e) => set("sku", e.target.value)} placeholder="cth. BRS-5KG" />
          </FormField>
          <FormField label="Barcode" error={errors.barcode} hint="Boleh kosong bila tidak dipakai.">
            <input className="input" value={values.barcode} onChange={(e) => set("barcode", e.target.value)} />
          </FormField>
          <FormField label="Kategori" error={errors.kategori}>
            <input className="input" value={values.kategori} onChange={(e) => set("kategori", e.target.value)} list="daftar-kategori" />
            <datalist id="daftar-kategori">
              <option value="Sembako" /><option value="Bumbu" /><option value="Minuman" />
              <option value="Kebersihan" /><option value="Paket" />
            </datalist>
          </FormField>
          <FormField label="Satuan" error={errors.satuan}>
            <input className="input" value={values.satuan} onChange={(e) => set("satuan", e.target.value)} placeholder="pcs / kg / sak" />
          </FormField>
          <FormField label="Harga beli (HPP dasar)" error={errors.hargaBeli} hint="Diperbarui otomatis saat pembelian; di sini manual.">
            <input type="number" min={0} className="input text-right tabular-nums" value={values.hargaBeli || ""} onChange={(e) => set("hargaBeli", Number(e.target.value))} />
          </FormField>
          <FormField label="Harga jual (Rp)" error={errors.hargaJual}>
            <input type="number" min={0} className="input text-right tabular-nums" value={values.hargaJual || ""} onChange={(e) => set("hargaJual", Number(e.target.value))} />
          </FormField>
          <FormField label="Stok minimal peringatan" error={errors.stokMinimum}>
            <input type="number" min={0} className="input text-right tabular-nums" value={values.stokMinimum || ""} onChange={(e) => set("stokMinimum", Number(e.target.value))} />
          </FormField>
          <FormField label="Stok tersedia" error={errors.stok} hint="Nantinya hasil mutasi stok engine — di mock ini diedit manual.">
            <input type="number" min={0} className="input text-right tabular-nums" value={values.stok || ""} onChange={(e) => set("stok", Number(e.target.value))} />
          </FormField>
          <FormField label="Status" error={errors.status}>
            <select className="input" value={values.status} onChange={(e) => set("status", e.target.value as FormValues["status"])}>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </FormField>

          {serverError && <p className="sm:col-span-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{serverError}</p>}

          <div className="mt-2 flex gap-2 sm:col-span-2">
            <button type="submit" disabled={mutationPending} className="btn-primary flex-1 disabled:opacity-40">
              {mutationPending ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Produk"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
