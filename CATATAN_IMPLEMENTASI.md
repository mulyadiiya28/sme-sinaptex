# Catatan Implementasi Backend & Frontend

> Status per **2026-11-04**. Dokumen ini menggantikan rencana bertahap yang
> sudah usang (semua Phase 1–3 sudah ada di engine maupun di POS).

## Ringkasan Status

### Backend (acc-sinaptex, nested repo)
**Status:** semua endpoint yang dibutuhkan POS sudah ada; build 0 warning, tes 1199 lulus
(485 unit + 714 integration).

- ✅ **Sudah ada:** Auth (JWT + refresh), Products (+import, deactivate), Customers (+import),
  Shifts, Sales, Purchases, Returns (sales & purchases), Journal, Expenses, Audit log,
  User management (GET/PUT/DELETE + `authorityLevel`), Stock adjustment, Payment settlements
  (piutang/hutang), QRIS confirm-payment, Opening balances, Suppliers, Units, Warehouses,
  Cash accounts, Reports (trial-balance, daily-movement, export, AR/AP), Analytics,
  Fiscal periods, Company profile + logo, RBAC, Backup, Loans, Inter-branch transfer.

### Frontend (sme-sinaptex)
**Status:** mode live terpasang untuk seluruh alur operasional; `API_MODE` default masih `mock`.

- ✅ **Terhubung ke engine:** Auth, Produk (CRUD + impor + penyesuaian stok), Pelanggan (+ impor),
  Shift, Checkout, Riwayat penjualan, Retur, Void, Pembelian (+ master pemasok), Piutang/Hutang
  (pelunasan, termasuk dari layar Kasir), Konfirmasi QRIS, Biaya, Jurnal, Neraca saldo (saldo
  awal/debit/kredit/saldo berjalan), Laba-rugi, User management, Audit log, Profil toko (company
  profile + logo), Kebijakan operasional, Periode fiskal, Aturan approval, Umur piutang/hutang +
  rekonsiliasi, Analitik (kesehatan usaha, profitabilitas, perputaran, likuiditas, solvabilitas,
  siklus kas, performa produk).
- 🟡 **Belum dipakai frontend (endpoint-nya sudah ada):** Cash transfer, Inter-branch transfer,
  Loans, Payments (advance/refund), Purchase return, Email settings, Backup/restore,
  RBAC (roles/permissions/user-roles), QR & faktur PDF engine, Cash-account movements,
  Branch/Warehouse management, Product unit.

## Hasil Audit Mock/Stub (2026-10-31)

Ditemukan dan **sudah diperbaiki**:

1. Backend tertinggal 2 commit dari `origin/main` →/journal, expenses, audit-log, users,
   adjustments, imports, payments, confirm-payment, opening-balances semuanya 404. Sudah di-pull.
2. Panel "Akun demo" tampil di mode live → kini hanya di mode mock (`API_MODE`).
3. `GET /api/users` tidak mengirim peran → engine kini mengembalikan `authorityLevel`
   (99 = pemilik, 2 = kasir); POS memetakan ke `role` dan bisa mengubahnya.
4. Nama kasir di riwayat/struk = GUID `requestedBy` → engine kini mengembalikan `requestedByName`
   (nama), dan POS memakai user yang sedang login sebagai operator.
5. Shift tidak mencatat siapa yang membukanya → `Shift.CashierUserId` (migration baru); POS
   menampilkan peringatan "Shift dibuka oleh X".
6. Profil toko hanya di localStorage → disambungkan ke `GET/PUT /api/settings/company-profile`.
7. Search & lonceng di topbar dekorasi → search global (produk/transaksi/menu) + panel notifikasi
   (stok menipis, transaksi menunggu pembayaran, shift milik orang lain).
8. Neraca saldo hanya "Saldo akhir" → kini **Saldo awal | Debit | Kredit | Saldo berjalan** dengan
   filter rentang tanggal (`openingBalance`/`closingBalance` dari engine).
9. `PUT /api/users/{id}` tidak pernah menulis apa pun (`UserRepository.GetByIdAsync` memakai
   `AsNoTracking`, jadi service memutasi objek lepas) — API menjawab "updated" padahal baris
   tidak berubah. Repository sekarang tracking; tes regresi mengunci password lama mati.
10. Konfirmasi digital live memanggil `/api/sales/{nomor}/confirm-payment` padahal rute engine
    menerima **id** penjualan → 404. Nomor kini diterjemahkan dulu, dan hasil konfirmasi
    mengembalikan dokumen nyata (bukan objek kosong).
11. Riwayat retur live menampilkan kolom Item dan Alasan kosong → detail retur + penjualan asal
    kini diambil, jadi nama item, jumlah, dan alasannya tampil.
12. **`PUT /api/settings/company-profile` menolak email kosong** (`[EmailAddress]` memaafkan null,
    tapi menolak `""` — padahal default DTO-nya `""`). Toko tanpa email tidak bisa menyimpan
    profil, dan GET mengembalikan `""` yang justru ditolak PUT. Diperbaiki di engine: validasi
    email pindah ke `Validate()` DTO; `""` berarti "tidak ada email", email yang ada harus berbentuk
    alamat. Ditutup 2 tes regresi.
13. **Logo toko terunggah tapi URL-nya 404** — folder `wwwroot` belum ada saat startup, jadi
    provider static-files kosong; berkas ada di disk, tapi tidak pernah disajikan. Diperbaiki di
    engine: folder penyimpanan dibuat sebelum middleware meminta provider, dan folder storage
    dipetakan ke `FileStorage:UrlBase` (bukan webroot) supaya URL tetap benar walau folder
    penyimpanan diarahkan ke tempat lain (tes, disk bersama). Ditutup tes "URL yang diberikan harus
    benar-benar terbuka".
14. **`GET /api/analytics/health-summary` tanpa `date` → 500** (`DateTime.MinValue.AddMonths(-12)`
    meledak), dan 4 endpoint neraca lain membaca buku "tahun satu" lalu menjawab nol. Diperbaiki:
    `date` jadi opsional, default ke hari ini (`ResolveReadDate`).

## Fitur Baru (3 Nov 2026)

1. **Unggah logo toko** (Pengaturan → Profil Toko): berkas PNG/JPEG ≤2 MB diunggah ke engine
   (`POST /api/settings/company-profile/logo`), logo tampil di pratinjau, topbar, dan tercetak di
   struk. URL logo engine relatif → `urlLogoAbsolut()` menempelkan host engine. Hapus logo =
   `PUT company-profile` dengan `logoUrl: ""`. Mode mock menolak dengan pesan jelas (tidak ada
   penyimpanan berkas di browser).
2. **Panel "Kesehatan usaha" di dashboard**: Rasio Lancar, Rasio Kas, Modal Kerja + verdict dan
   penjelasan per indikator. Di live angkanya dari `GET /api/analytics/health-summary` (10
   indikator, dihitung engine dari jurnal yang sama dengan neraca saldo); di mode mock POS
   menghitung sendiri 3 indikator yang memang bisa dihitung dari akun mock. Panel punya state
   loading (skeleton) dan error (engine offline → tombol "Coba lagi").

Masih jadi gap (tercatat, belum dikerjakan):

- Live: pembayaran campuran dan overpayment (kembalian) ditolak engine.
- Live: diskon dilebur ke `unitPrice` → riwayat/struk live tidak menampilkan diskon.
- Live: master pemasok hanya bisa dibuat/dinonaktifkan; kode & nama tidak bisa diubah (engine
  sengaja `init`-only agar faktur lama tetap menunjuk nama yang benar).
- Live: satu shift aktif per tenant (bukan per kasir).
- Live: QRIS belum jadi konsep engine → konfirmasi digital hanya jalan bila engine punya
  pembayaran tertunda untuk penjualan itu.
- POS: multi-branch belum dipakai (`X-Branch-Id` tidak dikirim).
- POS: 7 indikator kesehatan lain (perputaran modal kerja, margin bersih, ROE, rasio utang,
  perputaran persediaan, penagihan piutang, siklus kas) hanya ada di live — mode mock sengaja
  tidak mengarangnya.
- Mock: uang memakai `number` JS, pembulatan bisa berbeda dari engine.

## Pembaruan 4 Nov 2026 (sinkronisasi `origin/main`)

Repo POS dan engine sama-sama tertinggal dari `origin/main`; keduanya sudah di-merge (bukan
reset), jadi pekerjaan lokal (identitas kasir, neraca saldo 4 kolom, logo, kesehatan usaha)
tetap utuh dan bertemu fitur baru upstream.

**Dari upstream (POS):** halaman master pemasok (`/supplier`), dropdown pemasok di form pembelian
(`supplierId` wajib), halaman aturan approval, periode fiskal & kebijakan operasional di
Pengaturan, analisis keuangan + gerakan harian di Laporan, umur piutang/hutang + rekonsiliasi di
Keuangan, dan jalur **kredit penuh** (pembayaran 0) untuk kasir.

**Dari upstream (engine):** `c6160ce` (cash batch pembayaran 0), `09b89e2` (kebijakan operasional
per tenant + migrasi `AddOperationalPolicy`), `4e7533c` (validasi `productId`/`warehouseId` di
penyesuaian stok).

**Perbaikan yang dikerjakan saat merge:**

1. **Pemetaan profil toko live salah di upstream** — engine mengirim `companyName`/`address`/
   `taxNumber`, sedangkan kode upstream membaca `nama`/`alamat`/`npwp`, jadi seluruh profil
   terbaca kosong. Sekarang `liveCompanyProfileGet/Put` memetakan lewat `BtProfil` + `petakanProfil`.
2. **Mock supplier upstream hanya stub** — `list()` selalu `[]` padahal form pembelian mewajibkan
   pemasok, sehingga pembelian **tidak bisa dibuat sama sekali di mode mock**. Sekarang mock punya
   daftar pemasok in-memory (seed "Toko Grosir Sembako") + buat/nonaktifkan dengan validasi kode unik.
3. **`liveSupplierList`/`livePembelianList` tidak memakai `includeInactive`** — pemasok yang
   dinonaktifkan hilang dari master dan nama pada faktur lama jatuh ke GUID. Sekarang keduanya
   memakai `?includeInactive=true`, dan dropdown pembelian menyaring yang aktif saja.
4. **Ringkasan hutang per pemasok** ditambahkan di tab Hutang halaman Keuangan (dikelompokkan
   lewat `supplierId`, fallback nama untuk faktur lama).

**Fitur baru: penerimaan piutang dari layar Kasir.** Sebelumnya kasir tidak punya jalan menagih
piutang (menu Keuangan owner-only) dan kasir tidak bisa membuka halaman itu. Sekarang ada tombol
**Terima Piutang** (shortcut **F6**) di layar POS: daftar faktur bersisa piutang + pencarian,
nominal (default = sisa), metode tunai/transfer, lalu kuitansi yang bisa dicetak. Engine tidak
meminta approval terpisah untuk `POST /api/sales/{id}/payments`, jadi kasir level 2 boleh menagih.

**Uji live 4 Nov 2026 (setelah merge):** buat pemasok → nonaktifkan → daftar default menyembunyikan
yang nonaktif sementara `includeInactive=true` tetap menampilkannya → **pembelian 100% hutang**
(`paymentAmount: 0`, `supplierId` terisi) diterima 201 (`PURCHASE-00002`) dan muncul di AP ageing
Rp30.000 dengan `counterpartyId` = pemasok → kasir level 2 membuat **penjualan kredit penuh**
(`paymentAmount: 0`, `SALE-00008`, outstanding Rp50.000) → kasir menagih Rp20.000 → sisa piutang
Rp30.000 di AR ageing.

## Verifikasi

- Backend: `dotnet build AccountingEngine.slnx` (0 warning) + `dotnet test` → **485 unit + 714 integration** lulus.
- Frontend: `npx tsc --noEmit` bersih + `npm run build` sukses (15 halaman statis).
- **Uji kontrak live (31 Okt 2026, engine nyata di `http://localhost:5121`)**: login pemilik →
  `GET /api/users` (authorityLevel 99) → buat kasir (`fullName` + peran tersimpan) → ubah peran
  jadi 99 lalu **dibaca ulang dari DB** (bukan cuma respons) → tutup shift lama & buka shift baru
  dengan `cashierUserId` (dikembalikan engine) → `POST /api/sales` dengan `requestedBy` →
  `requestedByName` = "Budi Santoso" → `GET /api/sales` memuat `description` utuh sehingga shiftId
  terbaca dari deskripsi → **checkout `POST /api/cash-batches/sales` 201** (SALE-00005, total
  Rp75.000, kas 1121 bergerak) → trial balance membuka `openingBalance`/`closingBalance` yang
  konsisten (opening 27 Okt → periode 28 Okt → closing) dan grand total tetap periode-saja →
  company profile GET/PUT/GET (termasuk email kosong) → daftar & detail retur.
- Konfirmasi digital live: rute `/api/sales/{id}/confirm-payment` **sudah ketemu** (ragu-ragu
  "404 No pending payment found" = aturan engine: penjualan uji tidak punya pembayaran QRIS
  tertunda). QRIS sendiri belum jadi konsep engine.
- **Uji live 3 Nov 2026 (ringkasan kesehatan + logo)**: `GET /api/analytics/health-summary` tanpa
  `date` → 200 (dulu 500) → dengan `date` → 10 indikator lengkap dengan rating/penjelasan/patokan
  → `POST /api/settings/company-profile/logo` → 200 dengan `logoUrl` → **URL logo diunduh 200 dan
  isinya PNG asli** (dulu 404) → `PUT company-profile` tanpa logo → `logoUrl` kosong lagi.
- Mock: `ringkasanKesehatan()` diuji langsung (node + type-stripping): Rasio Lancar & Rasio Kas
  "TIDAK BERLAKU" (tidak ada liabilitas lancar untuk dibandingkan), Modal Kerja Rp8.378.500
  (BAIK), verdict "CUKUP SEHAT" — bukan "SEHAT" yang flattering.

## Catatan Penting

1. **Engine adalah nested git repo** — perubahan di `backend/` tidak ikut commit repo POS.
2. **Environment setup**:
   - Backend: `http://localhost:5121` (Accounting Engine).
   - Frontend: `.env.local` (sudah dibuat, gitignored) dengan `NEXT_PUBLIC_API_MODE=live` dan
     `NEXT_PUBLIC_API_BASE_URL=http://localhost:5121`. **Untuk server toko, ganti base URL ke
     `http://<server-toko>:5121` lalu build ulang.**
   - Tanpa `.env.local`, POS berjalan di mode **mock** (nilai di-bake saat build).
3. **Database**: `dotnet ef database update` → `tools/bootstrap-backend.py` → seed chart via
   `POST /api/accounts/seed`. Migrasi `AddShiftCashierUserId` **sudah diterapkan** ke DB dev.
4. **Dokumentasi**: `AGENTS.md`, `backend/knowledge.md`, `backend/AGENTS.md` diperbarui.
5. **Uji manual di browser masih belum dilakukan** — sesi ini tidak punya browser yang terhubung.
   Yang sudah terverifikasi lewat HTTP: kontrak engine. Yang perlu dicek manusia: tampilan,
   alur kasir di layar, dan struk.

## Next Steps

1. Hubungkan analytics engine ke Dashboard/Laporan (menggantikan perhitungan manual di browser).
2. Master pemasok: `POST/GET/PUT /api/suppliers` dipakai POS, `supplierId` tidak lagi `null`.
3. Shift per kasir di engine (butuh kas/account sendiri per kasir, bukan sekadar penanda).
4. Backup/restore, fiscal period, dan approval rule tampil di POS sebagai menu operasional.
