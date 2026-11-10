# Catatan Implementasi Backend & Frontend

> Status per **2026-11-10**. Dokumen ini merangkum fitur yang tersedia, celah yang
> masih ada, dan bagian yang **belum** menyentuh database engine. Verifikasi angka
> di bagian "Verifikasi" diambil dari build dan test terakhir.

## Ringkasan Status

### Backend (`acc-sinaptex`, nested repo)
**Status:** semua endpoint yang dibutuhkan POS sudah ada; build 0 warning, tes **1224 lulus**
(485 unit + 739 integration).

- ✅ **Sudah ada:** Auth (JWT + refresh), Products (+import, deactivate), Customers (+import),
  Shifts, Sales, Purchases, Returns (sales & purchases), Journal, Expenses, Audit log,
  User management (GET/PUT/DELETE + `authorityLevel`), Stock adjustment, Payment settlements
  (piutang/hutang), QRIS confirm-payment, Opening balances, Suppliers, Units, Warehouses,
  Cash accounts, Reports (trial-balance, daily-movement, export, AR/AP), Analytics,
  Fiscal periods, Company profile + logo, RBAC, Backup, Loans, Inter-branch transfer,
  Inventory (stock, movements, transfers, opnames), Fixed assets (+mutations).

### Frontend (`sme-sinaptex`)
**Status:** **16 halaman** ter-render statis (15 menu + login). Seluruh **100 method `api.*`**
di `src/lib/api/client.ts` punya cabang `live` — tidak ada jalur mock-only di layer API.
97 fungsi `live*` di `src/lib/api/live.ts` menjadi jembatan ke engine C#.

- ✅ **Terhubung ke engine:** Auth, Produk (CRUD + impor + penyesuaian stok), Pelanggan (+ impor),
  Shift, Checkout, Riwayat penjualan, Retur penjualan, Void, Pembelian (+ master pemasok),
  Piutang/Hutang (pelunasan, termasuk dari layar Kasir), Konfirmasi QRIS, Biaya, Jurnal,
  Neraca saldo (saldo awal/debit/kredit/saldo berjalan), Laba-rugi, User management, Audit log,
  Profil toko (company profile + logo), Kebijakan operasional, Periode fiskal, Aturan approval,
  Persetujuan transaksi (batch tertahan), Umur piutang/hutang + rekonsiliasi, Analitik
  (kesehatan usaha, profitabilitas, perputaran, likuiditas, solvabilitas, siklus kas,
  performa produk), Persediaan (gudang, stok, kartu stok, transfer, opname), Aset tetap
  (CRUD, penyusutan, mutasi, register).

## Peta Halaman

| Kelompok | Halaman | Rute | Role |
|---|---|---|---|
| Auth | Login | `/login` | semua |
| Operasional | Dashboard | `/` | pemilik |
| | Kasir (POS layar penuh) | `/kasir` | semua |
| | Riwayat Transaksi | `/riwayat` | semua |
| | Shift Kasir | `/shift` | semua |
| Produk & Persediaan | Produk | `/produk` | pemilik |
| | Persediaan | `/persediaan` | pemilik |
| | Aset Tetap | `/aset-tetap` | pemilik |
| | Pembelian | `/pembelian` | pemilik |
| | Pemasok | `/supplier` | pemilik |
| Keuangan & Akuntansi | Keuangan | `/keuangan` | pemilik |
| | Akuntansi | `/akuntansi` | pemilik |
| | Laporan | `/laporan` | pemilik |
| Sistem | Persetujuan | `/persetujuan` | pemilik |
| | Aturan Approval | `/approval-rules` | pemilik |
| | Pengaturan | `/pengaturan` | pemilik |

Kasir hanya boleh membuka **Kasir / Riwayat / Shift**; `AuthGuard` menolak role lain
(`src/lib/nav.ts`).

## Yang SUDAH Pakai Database

### Mode live (engine C#)
Seluruh 100 method `api.*` memanggil `live*` yang menyentuh endpoint engine:

- **Auth** — `/api/auth/*` (login, refresh, revoke), `/api/audit-log`
- **Transaksi** — `/api/cash-batches/sales` (checkout), `/api/sales`, `/api/purchases`,
  `/api/sale-returns`, `/api/transactions/{id}/void`, `/api/sales/{id}/confirm-payment`,
  `/api/sales/{id}/payments`, `/api/purchases/{id}/payments`
- **Master** — `/api/products`, `/api/customers`, `/api/suppliers`, `/api/units`,
  `/api/warehouses`, `/api/cash-accounts`
- **Persediaan** — `/api/inventory/stock`, `/api/inventory/movements`,
  `/api/inventory/adjustments`, `/api/inventory/transfers`, `/api/inventory/opnames`
- **Aset tetap** — `/api/fixed-assets` (+ `/mutations`, `/depreciation`, `/depreciation/post`, `/report`)
- **Akuntansi** — `/api/journal`, `/api/accounts`, `/api/reports/trial-balance`,
  `/api/reports/daily-movement`, `/api/expenses`, `/api/cash-transfers`
- **Laporan & analitik** — `/api/reports/ar-ap/*`, `/api/analytics/*`
- **Sistem** — `/api/fiscal-periods`, `/api/approval-rules`, `/api/transactions?status=SUBMITTED`,
  `/api/settings/company-profile` (+ `/logo`), `/api/settings/operational-policy`
- **Impor** — `/api/products/import`, `/api/customers/import`, `/api/accounts/opening-balances`

### Mode mock
`src/lib/api/mock/db.ts` adalah "engine"-nya: jurnal double-entry, GL, P&L, stok, shift.
Sepenuhnya in-memory — **tidak ada `localStorage` di dalamnya**.

## Yang BELUM Pakai Database

### 1. Mode mock seluruhnya
Data (produk, transaksi, jurnal, shift, akun, pelanggan, pemasok) **reset tiap reload**.
Hanya dua store yang persist:

| Store | Kunci localStorage | Isi |
|---|---|---|
| `auth` | `pos-sinaptex-auth` | user + refresh token + kedaluwarsa |
| `toko` | `pos-sinaptex-toko` | profil + kebijakan operasional |

### 2. Field POS yang hanya di localStorage (`useToko`)
| Field | Consekuensi |
|---|---|
| `mataUang` | praktis hardcoded IDR |
| `zonaWaktu` | praktis hardcoded Asia/Jakarta |
| `footerStruk` | tidak ikut ke engine → faktur PDF yang dicetak server tidak memakai footer POS |
| `pajakPersen` | tarif hanya di browser (nilainya tetap dikirim ke engine sebagai `taxAmount`) |
| `pkpStatus` | status PKP/Non-PKP tidak tersimpan di engine |

> `nama`, `alamat`, `telepon`, `email`, `website`, `npwp`, dan `logoUrl` **sudah** masuk engine
> lewat `GET/PUT /api/settings/company-profile`.
> Kebijakan operasional (`izinkanKredit`, `saldoAwalShift`) juga **sudah** disinkronkan ke
> `/api/settings/operational-policy`; localStorage hanya cache.

### 3. Data yang disembunyikan di live karena engine tidak menyimpannya
- **Aset tetap** — `lokasi`, `akunAset`, `akunPenyusutan`, `akunBebanPenyusutan`, `catatan`.
  Kolom dan field form disembunyikan saat live; "hapus" berarti menonaktifkan.
- **Diskon** — POS + diskon per baris dilebur ke `unitPrice` → riwayat & struk live
  **tidak menampilkan diskon**.
- **Kembalian** — selalu 0 (engine menolak overpayment).
- **Piutang** — tidak disimpan di dokumen penjualan → POS ambil ulang dari AR ageing.

### 4. Angka yang dihitung ulang di POS (bukan dari DB)
- **Nilai persediaan** = `qty × purchasePrice master`. Engine belum membuka harga rata-rata
  per gudang, jadi angka nilai persediaan di live **tidak mencerminkan HPP**
  (`src/lib/api/live.ts:2647`).
- **Status pembayaran digital** di live dipetakan dari status penjualan, bukan flag tersendiri.

## Bug & Celah yang Masih Ada

| # | Item | Dampak / Catatan |
|---|---|---|
| 1 | Pembayaran campuran (tunai + non-tunai) ditolak engine | Kasir harus memilih satu metode per batch |
| 2 | Overpayment / kembalian ditolak engine | `kembalian` selalu 0 di live |
| 3 | QRIS belum jadi konsep engine | Status "menunggu konfirmasi" hanya ada di mock |
| 4 | Diskon hilang di live | Struk & riwayat live tidak punya diskon |
| 5 | Nilai persediaan live memakai harga beli master | Angka persediaan tidak akurat di live |
| 6 | Master pemasok tidak bisa diubah kode/nama | Engine `init`-only demi integritas faktur lama |
| 7 | Satu shift aktif per tenant (bukan per kasir) | POS menampilkan peringatan "shift dibuka oleh X" |
| 8 | Mutasi aset tidak menulis jurnal | Modul aset tetap memang tidak menjurnal perolehan |
| 9 | Impor produk live all-or-nothing | Satu baris ditolak = tidak ada yang ditulis; `satuan` harus sudah ada di master unit |
| 10 | Mock memakai `number` JS, bukan `decimal` | Pembulatan bisa berbeda dari engine |
| 11 | Pemilik boleh menyetujui transaksinya sendiri bila **tanpa** rule | Ada audit `APPROVAL_BYPASS` — disengaja, tapi perlu disadari |
| 12 | `BackupRestoreApiTests` kadang gagal saat suite penuh | SQLite locking saat paralel; lulus saat dijalankan sendiri |

## Fitur Engine yang Belum Dipakai POS

Endpoint-nya sudah ada di engine, tinggal dichotomi UI:

| Controller engine | Fitur yang bisa ditambahkan |
|---|---|
| `PurchaseReturnsController` | **Retur pembelian** — POS baru punya retur penjualan |
| `BackupsController` | Backup / restore database dari POS |
| `BranchesController` | Manajemen cabang (multi-cabang) |
| `InterBranchTransfersController` | Transfer antar cabang |
| `LoansController` | Pinjaman + akrual bunga |
| `RolesController` + `UserRolesController` | Manajemen RBAC (peran, izin, scope cabang) — POS hanya memakai `authorityLevel` |
| `EmailSettingsController` | Pengaturan email / notifikasi |

Selain itu, engine sudah menyediakan **kode QR** (`/api/sales/{id}/qrcode`) dan
**faktur PDF** (`/api/sales/{id}/pdf`) yang belum dipakai POS.

## Verifikasi

```
# Frontend
npx tsc --noEmit          # bersih
npm run build             # 16 halaman statis + manifest, export ke out/

# Backend (workdir backend)
dotnet build AccountingEngine.slnx   # 0 warning, 0 error
dotnet test AccountingEngine.slnx    # 485 unit + 739 integration = 1224 PASSED
```

**Test yang dipakai untuk fix engine `confirm-payment`:**
`backend/tests/AccountingEngine.IntegrationTests/ConfirmPaymentApiTests.cs` (4 test) —
kaki `CustomerPayment` ditemukan lewat BatchId dokumen (sebelum fix: 404 "no pending
payment"), kredit tanpa kaki → 404, tanpa `Idempotency-Key` → 400, approve dua kaki +
post batch → penjualan ter-post. Test pertama sudah dibuktikan menangkap bug.

## Catatan Penting

1. **Engine adalah nested git repo** — perubahan di `backend/` tidak ikut commit repo POS.
   Keduanya harus di-commit & di-push terpisah.
2. **Environment setup**:
   - Backend: `http://localhost:5121` (Accounting Engine).
   - Frontend: `.env.local` (gitignored) dengan `NEXT_PUBLIC_API_MODE=live` dan
     `NEXT_PUBLIC_API_BASE_URL=http://localhost:5121`. **Untuk server toko, ganti base URL
     ke `http://<server-toko>:5121` lalu build ulang.**
   - Tanpa `.env.local`, POS berjalan di mode **mock** (nilai di-bake saat build).
3. **Kode akun** dapat diatur lewat env `NEXT_PUBLIC_ENGINE_*` (kas, bank, piutang,
   persediaan, hutang, pendapatan, hpp, pajak, biaya) — lihat `.env.example`.
4. **Database**: `dotnet ef database update` → `tools/bootstrap-backend.py` → seed chart via
   `POST /api/accounts/seed`.
5. **Dokumentasi**: `AGENTS.md` (panduan agent), `DESIGN.md` (token UI), `README.md`.
6. **Uji manual di browser** — sesi tanpa browser terpasang tidak bisa memverifikasi tampilan.
   Yang sudah terverifikasi lewat HTTP: kontrak engine. Yang perlu dicek manusia: tampilan,
   alur kasir di layar, dan struk.

## Next Steps

1. Retur pembelian (`/api/purchase-returns`) — celah paling impacting karena POS sudah punya
   retur penjualan.
2. Nilai persediaan dari HPP per gudang (butuh endpoint harga rata-rata di engine).
3. Dukungan pembayaran campuran + kembalian di engine (batch kas menerima satu akun kas).
4. Diskon sebagai field tersendiri di dokumen penjualan engine.
5. QRIS sebagai konsep engine (status menunggu konfirmasi + settlement).
6. UI backup/restore dan manajemen cabang.
