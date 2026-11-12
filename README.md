# POS-Sinaptex — Frontend

Smart Retail Operations & Accounting untuk toko UMKM: kasir, persediaan, keuangan, dan akuntansi otomatis.

- **Stack**: Next.js 15 (App Router, static export) · TypeScript · Tailwind CSS v4 · TanStack Query · Zustand · Zod · Serwist (PWA)
- **Produksi**: build statis (`npm run build` → `out/`) dibungkus Tauri 2 → `POS-Sinaptex.exe` (Windows installer NSIS + MSI). Komputer toko tidak perlu Node.js/terminal.
- **Backend**: Accounting Engine (C# / .NET 10, ASP.NET Core + EF Core/SQLite) di repo nested `backend/` — REST API + JWT, dijalankan terpisah di server toko (Mode A: LAN).
- **Mode data**: `mock` (default, in-memory, reset tiap reload) | `live` (HTTP ke engine via `NEXT_PUBLIC_API_MODE=live`).

---

## Menjalankan

```bash
# Frontend
npm install
npm run dev        # http://localhost:3000 — kasir di /kasir
npm run build      # static export → out/ (wajib sebelum Tauri build)
npx tauri dev      # desktop dev (menjalankan npm run dev otomatis)
npx tauri build    # installer Windows
npx tsc --noEmit   # typecheck (repo ini tanpa lint/test runner)
```

```bash
# Backend (Accounting Engine) — dari folder backend/
cd backend
dotnet build AccountingEngine.slnx
dotnet ef database update -p src/AccountingEngine.Infrastructure -s src/AccountingEngine.Api
dotnet run --project src/AccountingEngine.Api/AccountingEngine.Api   # http://localhost:5121
```

Bootstrap pertama kali (idempoten):
```bash
# dari root repo POS
pip install bcrypt
python tools/bootstrap-backend.py
curl -X POST http://localhost:5121/api/accounts/seed -H "X-Business-Id: toko-utama"
```
Default: tenant `toko-utama`, user `pemilik`/`pemilik123` (level 99 = owner), akun kas `1121` (tunai, default) + `1111` (bank).

Mode live:
```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_MODE=live, base URL engine, tenant id, kode akun
npm run dev
```

---

## Fitur Utama (MVP + P1)

| Area | Fitur |
|------|-------|
| **Kasir** | Katalog produk (cari/barcode/keyboard), keranjang, diskon item & transaksi, pelanggan, pembayaran tunai/transfer/QRIS/campuran, kembalian, piutang, idempotensi, cetak struk |
| **Shift** | Buka shift (saldo awal dari pengaturan), kas masuk/keluar, tutup shift (selisih fisik vs sistem), riwayat shift |
| **Produk** | CRUD (Zod validasi), kategori, satuan, harga beli/jual, stok min, impor CSV/XLSX (mock: per baris; live: all-or-nothing), penyesuaian stok (owner) |
| **Pembelian** | Faktur pembelian (pemasok wajib), item, metode tunai/bank/hutang, stok & hargaBeli ter-update otomatis, jurnal otomatis |
| **Keuangan** | 4 tab: Kas & Bank (rekonsiliasi), Biaya (catat + tabel), Piutang (pelunasan), Hutang (pelunasan ke pemasok) |
| **Akuntansi** | Neraca saldo (Saldo awal \| Debit \| Kredit \| Saldo berjalan), Jurnal otomatis expandable, Buku besar, Laba-rugi |
| **Laporan** | Omzet & rata-rata, penjualan per hari, nilai persediaan, analisis keuangan (12 endpoint engine), gerakan harian, ekspor CSV |
| **Pengaturan** | Profil toko (sync ke engine), logo (unggah ke engine), kebijakan operasional, periode fiscal, aturan approval, master pemasok, pengguna & audit log |
| **Auth & Akses** | Login (demo: `pemilik`/`pemilik123`, `kasir`/`kasir123`), role `pemilik` (full) & `kasir` (Kasir/Riwayat/Shift), sidebar & route guard per role, JWT access token (memory) + refresh token |

---

## PWA (Serwist)

Build statis juga installable sebagai PWA (jalur kedua selain Tauri):
- Service worker: precache semua aset + `navigateFallback: "/index.html"`; runtime cache `NetworkFirst` untuk `/api/**` (max 24 jam)
- Manifest: `src/app/manifest.ts` → `/manifest.webmanifest`; ikon placeholder di `public/`
- SW dinonaktifkan saat `next dev`; aktif hanya di build produksi
- Catatan: di Tauri (WebView2) registrasi SW bisa ditolak — tidak fatal

---

## Arsitektur Singkat

```
src/
  app/                    # Next.js App Router
    layout.tsx            # root layout + providers
    login/page.tsx        # login tanpa shell
    kasir/page.tsx        # POS full-screen (di luar grup (app))
    (app)/                # AppShell + AuthGuard: dashboard, produk, riwayat, shift, pembelian, supplier, keuangan, akuntansi, laporan, approval-rules, pengaturan
  components/             # shared UI + kasir/ + produk/
  hooks/queries.ts        # SEMUA TanStack Query hooks
  lib/
    api/types.ts          # domain types (kontrak C#)
    api/client.ts         # facade api.*, switch mock|live
    api/live.ts           # HTTP ke engine + mapping DTO
    api/mock/db.ts        # in-memory mock engine
    store/                # zustand: auth, toko, cart
    csv.ts, format.ts, nav.ts, struk.ts, utils.ts
  sw.ts                   # Serwist config
src-tauri/                # Rust shell minimal
backend/                  # nested git repo (Accounting Engine .NET 10)
tools/bootstrap-backend.py
```

**Aturan lapisan**: Semua akses data lewat `api.*` (`src/lib/api/client.ts`). Komponen **tidak pernah** memanggil `mock/db.ts` atau `live.ts` langsung. HTTP/JWT/refresh/idempotensi hanya di `live.ts`.

---

## Konvensi Penting

- TypeScript strict, `type` over `interface`, named export
- Path alias `@/*` → `src/*`
- `"use client"` hanya bila butuh hooks/state/browser API
- `className?: string` + `cn()` (join sederhana, tanpa clsx)
- Utility Tailwind yang ada: `panel`, `btn-primary`, `btn-secondary`, `btn-accent`, `input`, `label` (lihat `DESIGN.md`)
- Uang: `<MoneyDisplay value={...} />` / `formatIDR()` + `tabular-nums`
- Tabel: `<DataTable<T> ... loading skeletonRows />`
- Loading: skeleton components (`src/components/skeleton.tsx`)
- Validasi: Zod hanya di `product-form-dialog.tsx`; sisanya hand-roll + pesan ID
- Dialog: overlay buatan sendiri, ikon `lucide-react` + `aria-hidden`, tombol ikon wajib `aria-label`
- React Query key: array string pendek (`["products"]`, `["transaksi"]`, `["shift"]`, …)
- Zustand: 1 store per concern, persist hanya `auth` & `toko`

---

## Domain Rules Ringkas

- Kasir **tidak bisa transaksi sebelum shift dibuka** (panel pemblokir + link Buka Shift)
- Shift **tidak auto-open** saat login; nama kasir di layar/struk = user login; shift catat `cashierUserId` (pembuka)
- Checkout bawa `idempotensiKunci` (`crypto.randomUUID()`) → `Idempotency-Key`
- Alokasi: tunai boleh > sisa (kembalian); transfer/QRIS tidak boleh > sisa; kekurangan → piutang hanya bila `izinkanKredit`
- Status bayar terpisah dari status transaksi: `lunas | menunggu_pembayaran | dibayar_sebagian | dibatalkan`
- Void/retur/penyesuaian stok/konfirmasi digital/impor = owner only; jurnal pembalik, bukan hapus
- Saldo selalu dari jurnal; tidak ada input saldo manual (kecuali impor saldo awal)
- Retur proporsional (neto + pajak + porsi diskon), refund = yang dibayar pelanggan

---

## Gotcha Mode Live

- Engine pakai **id** dokumen; POS simpan nomor (`SALE-00001`) → terjemahkan dulu (`cariPenjualanByNomor`)
- **Pembayaran campuran didukung penuh**: engine menerima `payments[]` (satu kaki per metode), menulis 1 cash movement per akun + 1 jurnal settlement + 1 alokasi total
- **Kembalian dihitung POS**: tunai boleh > sisa (kelebihannya = kembalian), transfer/QRIS tidak boleh > sisa; engine hanya terima bagian yang diterima kasir
- Bayar 0 (kredit penuh) **diizinkan**: dokumen ditulis tanpa cash movement, piutang tetap terbuka
- `piutang` dari `/api/reports/ar-ap/aging?side=RECEIVABLE`; `terbayar` pembelian dari `side=PAYABLE` (jangan pakai `payableAmount` — itu bruto)
- Diskon transaksi disebar ke baris → riwayat/struk live menampilkan diskon per baris (tidak ada baris `diskonTransaksi` terpisah)
- Void engine 409 (POSTED) → POS fallback ke retur penuh
- Master pemasok: list/create/nonaktifkan saja (tanpa update kode/nama); list pakai `?includeInactive=true`
- Satu shift aktif per tenant (bukan per kasir)
- Impor produk live all-or-nothing, `satuan` harus ada di master unit, stok awal tidak diimpor
- Profil toko sync ke `/api/settings/company-profile`; field POS (`mataUang`, `zonaWaktu`, `footerStruk`, `pajakPersen`) di localStorage
- Logo diunggah ke engine (mock menolak)
- QRIS bukan konsep engine; konfirmasi lewat `POST /api/sales/{id}/confirm-payment` hanya untuk batch tertahan approval
- Batch tertahan approval: `/persetujuan` → `GET /api/transactions?status=SUBMITTED` → approve per kaki → `POST /api/cash-batches/{batchId}/post`

---

## Verifikasi

- Frontend: `npx tsc --noEmit` bersih + `npm run build` sukses (15 halaman statis)
- Backend: `dotnet build AccountingEngine.slnx` (0 warning) + `dotnet test` (485 unit + 714 integration lulus)
- Mock: alur manual `/kasir` (buka shift → checkout → riwayat → tutup shift)

---

## Dokumentasi

**Teknis (Developer):**
- `AGENTS.md` — **Aturan proyek lengkap** (sumber utama untuk agen/AI)
- `DESIGN.md` — Token design system & utility yang benar-benar ada
- `docs/rencana-desain-ui-ux.md` — Arsip historis: blueprint desain, kontrak endpoint usulan vs aktual, log perbaikan
- `backend/README.md`, `backend/AGENTS.md`, `backend/knowledge.md` — Spesifikasi engine (repo terpisah)

**User (Owner/Kasir):**
- `docs/README-DOKUMENTASI.md` — **Panduan navigasi** (baca ini dulu!)
- `docs/MANUAL-OWNER.md` — Manual lengkap owner (50 hal, tutorial detail)
- `docs/MANUAL-KASIR.md` — Manual lengkap kasir (20 hal, tutorial sederhana)
- `docs/QUICK-START-OWNER.md` — Cheat sheet owner (2 hal, cetak & tempel)
- `docs/QUICK-START-KASIR.md` — Cheat sheet kasir (1 hal, cetak & tempel)
- `docs/DEPLOYMENT-CHECKLIST.md` — Checklist deployment production (15 hal)

**Total:** 105 halaman dokumentasi user + deployment ready 🚀