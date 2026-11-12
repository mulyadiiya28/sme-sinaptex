# Catatan Implementasi Backend & Frontend

> Status per **2026-11-10**. Dokumen ini merangkum fitur yang tersedia, celah yang
> masih ada, dan bagian yang **belum** menyentuh database engine. Verifikasi angka
> di bagian "Verifikasi" diambil dari build dan test terakhir.

## Ringkasan Status

### Backend (`acc-sinaptex`, nested repo)
**Status:** semua endpoint yang dibutuhkan POS sudah ada; build 0 warning, tes **1229 lulus**
(485 unit + 744 integration).

- ✅ **Sudah ada:** Auth (JWT + refresh), Products (+import, deactivate), Customers (+import),
  Shifts, Sales, Purchases, Returns (sales & purchases), Journal, Expenses, Audit log,
  User management (GET/PUT/DELETE + `authorityLevel`), Stock adjustment, Payment settlements
  (piutang/hutang), QRIS confirm-payment, Opening balances, Suppliers, Units, Warehouses,
  Cash accounts, Reports (trial-balance, daily-movement, export, AR/AP), Analytics,
  Fiscal periods, Company profile + logo, RBAC, Backup, Loans, Inter-branch transfer,
  Inventory (stock, movements, transfers, opnames), Fixed assets (+mutations).

### Frontend (`sme-sinaptex`)
**Status:** **16 halaman** ter-render statis (15 menu + login). Seluruh **101 method `api.*`**
di `src/lib/api/client.ts` punya cabang `live` — tidak ada jalur mock-only di layer API.
98 fungsi `live*` di `src/lib/api/live.ts` menjadi jembatan ke engine C#.

- ✅ **Terhubung ke engine:** Auth, Produk (CRUD + impor + penyesuaian stok), Pelanggan (+ impor),
  Shift, Checkout, Riwayat penjualan, Retur penjualan, Void, Pembelian (+ retur pembelian +
  master pemasok),
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
Seluruh 101 method `api.*` memanggil `live*` yang menyentuh endpoint engine:

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
- **Diskon header** — engine hanya menyimpan diskon per baris; POS menyebar diskon transaksi
  ke baris saat checkout, jadi riwayat/struk live menampilkan diskon per baris.
- **Kembalian** — hanya dikembalikan saat checkout; kartu riwayat tidak menyimpannya karena yang
  masuk laci memang hanya bagian yang diterima.
- **Piutang** — tidak disimpan di dokumen penjualan → POS ambil ulang dari AR ageing.

### 4. Angka yang dihitung ulang di POS (bukan dari DB)
- **Nilai persediaan** — halaman Persediaan dan KPI Laporan memakai
  `GET /api/inventory/stock-valuation?warehouseId=` (harga rata-rata/HPP engine). Tampilan
  "Semua Gudang" menjumlahkan valuasi tiap gudang karena endpoint hanya menerima satu gudang.
- **Status pembayaran digital** di live dipetakan dari status penjualan + kaki pembayaran
  (`GET /api/sales/payments?from=&to=`). QRIS kini punya akun gateway sendiri (`1130`), dan
  "menunggu konfirmasi" dideteksi dari belum adanya movement keluar bertanda `[QRIS <nomor>]`.
- **Total checkout** dihitung POS dengan pembulatan yang sama persis seperti engine
  (`src/lib/uang.ts`: qty 4dp, harga 2dp, gross 2dp, diskon 2dp, sebaran diskon transaksi
  identik), jadi total layar = `documentTotal` engine — tidak ada selisih sub-rupiah yang
  memicu "pembayaran kurang" palsu. Helper ini dipakai bersama oleh layar kasir, mock, dan live.

## ✅ YA, Pembayaran Campuran dan Overpayment SUDAH SELESAI PENUH

**Update 2026-11-12:**

### Status: ✅ **SELESAI PENUH** (sejak engine commit `c6160ce`)

#### 1. Pembayaran Campuran (Split Payment)
- ✅ Setiap metode → 1 kaki: `payments: [{ cashAccountId, amount }]`
- ✅ Engine menulis: 1 cash movement per akun + 1 jurnal settlement + 1 alokasi total
- ✅ Contoh: Tunai Rp30k + Transfer Rp40k + QRIS Rp30k = Total Rp100k
- ✅ Verifikasi: `CashBatchApiTests` 3 test baru lulus

#### 2. Overpayment / Kembalian
- ✅ **Tunai**: Boleh > sisa → kelebihan = kembalian (dihitung POS)
- ✅ **Transfer/QRIS**: Tidak boleh > sisa (ditolak 400)
- ✅ Uang kembalian TIDAK masuk laci (yang masuk hanya bagian diterima)
- ✅ Contoh: Total Rp50k, bayar tunai Rp100k → engine terima Rp50k, kembalian Rp50k

#### 3. Kredit Penuh (Pembayaran 0)
- ✅ Checkout tanpa uang muka diizinkan
- ✅ Dokumen ditulis tanpa cash movement/settlement
- ✅ Piutang = total penuh, tetap terbuka

### Implementasi
**Kode:** `src/lib/api/live.ts` baris 1526-1587 (fungsi `alokasiMasuk` + `liveCheckout`)

**Test Backend:** 1242 lulus (490 unit + 752 integration)  
**Test Frontend:** 20.000 property test — 0 mismatch total vs engine

**Dokumentasi:** `AGENTS.md`, `CATATAN_IMPLEMENTASI.md`, `README.md` (sudah update)

---

## Bug & Celah yang Masih Ada

**Update 2026-11-12:** Semua bug kode yang dapat diperbaiki sudah selesai (lihat `PERBAIKAN-2026-11-12.md`).

| # | Item | Dampak / Catatan |
|---|---|---|
| 1 | ~~Pembayaran campuran (tunai + non-tunai) ditolak engine~~ | Diperbaiki: engine menerima `payments[]` (satu kaki kas per metode), satu jurnal settlement + satu alokasi total |
| 2 | ~~Overpayment / kembalian ditolak engine~~ | Diperbaiki: POS mengirim bagian yang benar-benar diterima dan menghitung `kembalian` sendiri |
| 3 | QRIS belum jadi konsep penuh di engine | Diperbaiki: checkout menahan dana di akun gateway `1130`; konfirmasi = transfer gateway→bank bertanda `[QRIS <nomor>]`; status "menunggu konfirmasi" dibaca dari movement gateway |
| 4 | Diskon hilang di live | Diperbaiki: engine menyimpan `SaleItems.DiscountAmount`; POS mengirim diskon per baris dan menyebar diskon transaksi ke baris |
| 5 | Nilai persediaan live memakai harga beli master | Diperbaiki: POS membaca `GET /api/inventory/stock-valuation` (HPP per gudang) |
| 6 | Master pemasok tidak bisa diubah kode/nama | Engine `init`-only demi integritas faktur lama |
| 7 | Satu shift aktif per tenant (bukan per kasir) | POS menampilkan peringatan "shift dibuka oleh X" |
| 8 | Mutasi aset tidak menulis jurnal | Modul aset tetap memang tidak menjurnal perolehan |
| 9 | Impor produk live all-or-nothing | Satu baris ditolak = tidak ada yang ditulis; `satuan` harus sudah ada di master unit |
| 10 | Mock memakai `number` JS, bukan `decimal` | Total checkout sudah dibulatkan sama seperti engine (`src/lib/uang.ts`); pembulatan internal mock (mis. HPP) masih bisa berbeda. **Array bounds & type safety sudah diperbaiki (2026-11-12).** |
| 11 | Pemilik boleh menyetujui transaksinya sendiri bila **tanpa** rule | Ada audit `APPROVAL_BYPASS` — disengaja, tapi perlu disadari |
| 12 | `BackupRestoreApiTests` kadang gagal saat suite penuh | SQLite locking saat paralel; lulus saat dijalankan sendiri |
| 13 | Retur penjualan yang ditahan approval belum masuk `/persetujuan` | Diperbaiki: `SALE_RETURN` + `PURCHASE_RETURN` sudah diproses di /persetujuan |

## Fitur Engine yang Belum Dipakai POS

Endpoint-nya sudah ada di engine, tinggal dichotomi UI:

| Controller engine | Fitur yang bisa ditambahkan |
|---|---|
| `InterBranchTransfersController` | Transfer antar cabang |
| `LoansController` | Pinjaman + akrual bunga |
| `RolesController` + `UserRolesController` | Manajemen RBAC (peran, izin, scope cabang) — POS hanya memakai `authorityLevel` |
| `EmailSettingsController` | Pengaturan email / notifikasi |

Sudah dipakai POS: `BackupsController` (tab **Backup Database** di Pengaturan:
buat/unduh/pulihkan), `BranchesController` (tab **Cabang**: daftar + buat
cabang), dan faktur PDF (`GET /api/sales/{id}/pdf` — tombol **Faktur PDF** di
dialog detail Riwayat; struk thermal tetap dicetak dari browser). POS **belum**
mengirim `X-Branch-Id`: engine menjaga stok per cabang, jadi pencatatan per
cabang baru bisa dipakai setelah gudang-gudang POS terikat ke cabang tujuan.

Engine juga menyediakan **kode QR** (`/api/sales/{id}/qrcode`) yang belum dipakai
POS.

## Verifikasi

```
# Frontend
npx tsc --noEmit          # bersih
npm run build             # 16 halaman statis + manifest, export ke out/

# Backend (workdir backend)
dotnet build AccountingEngine.slnx   # 0 warning, 0 error
dotnet test AccountingEngine.slnx    # 490 unit + 752 integration = 1242 PASSED
```

**Test baru pembayaran campuran:** `CashBatchApiTests` (repo engine) bertambah 3 test —
split payment menulis satu cash movement per akun kas, satu jurnal settlement seimbang
(N debit + 1 kredit piutang), satu alokasi total, dan outstanding 0; split payment yang
ditahan approval memposting ulang tiap kaki dari `PostingPlans.PaymentLegsJson`; total kaki
melebihi invoice tetap 409.

**Test paritas pembulatan (POS):** property test 20.000 kasus acak (qty desimal, harga
desimal, diskon baris + diskon transaksi, pajak 0/11%) membandingkan `totalParity()`
(`src/lib/uang.ts`) dengan perhitungan engine (qty 4dp, gross 2dp, diskon 2dp, sebaran
diskon proporsional dengan sisa ke baris terakhir) — **0 mismatch base dan 0 selisih total**.

**Test baru retur pembelian:** `PurchaseReturnsApiTests` (repo engine) bertambah 2 test — ...
**Test baru nilai persediaan:** `InventoryApiTests` (repo engine) bertambah 3 test —
`GET /api/inventory/stock-valuation?warehouseId=` mengembalikan nilai persediaan per produk
dengan rata-rata biaya (HPP) yang dihitung engine.
**Test baru kaki pembayaran:** `SalePaymentsApiTests` (repo engine) bertambah 4 test —
`GET /api/sales/{id}/payments` mengembalikan kaki pembayaran penjualan tunai (nominal +
kode akun kas), kosong untuk penjualan kredit, dan 404 untuk penjualan yang tidak ada;
`GET /api/sales/payments?from=&to=` mengelompokkan kaki per penjualan dan melewati penjualan
kredit.

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

1. **QRIS sudah jadi konsep penuh**: checkout menahan dana di akun gateway `1130`
   (`pastikanAkunKas`), konfirmasi = transfer gateway→bank bertanda `[QRIS <nomor>]`,
   dan status "menunggu konfirmasi" dibaca dari movement gateway.
2. **Nilai persediaan sudah memakai HPP engine** (`GET /api/inventory/stock-valuation`);
   sisa gap persediaan hanya endpoint yang belum ada (mis. master satuan konversi).
3. ~~Dukungan pembayaran campuran + kembalian di engine (batch kas menerima satu akun kas).~~
   Selesai: `POST /api/cash-batches/sales` menerima `payments[]`; kembalian dihitung POS.
4. ~~Diskon sebagai field tersendiri di dokumen penjualan engine.~~ Selesai (SaleItems.DiscountAmount).
5. Pencatatan per cabang: POS perlu mengirim `X-Branch-Id` dan gudang POS harus
   terikat ke cabang tujuan (engine menolak stok dari gudang cabang lain).
6. UI backup/restore dan manajemen cabang.
